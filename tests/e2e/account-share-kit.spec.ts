import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { publicBusinessDemoAccount } from "../../src/lib/demo-account";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

test.skip(
  !email || !password || !databaseUrl,
  "provisioned E2E account or database is not configured",
);

async function signIn(page: Page) {
  for (let attempt = 1; ; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    try {
      await expect(page).toHaveURL(/\/account$/);
      return;
    } catch (error) {
      if (attempt >= 3) throw error;
      await page.waitForTimeout(11_000);
    }
  }
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

async function createBusiness(page: Page, name: string): Promise<string> {
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(name);
  await page.getByLabel("Narrow the categories").fill("plumb");
  await page.getByRole("radio", { name: /Plumbing/ }).check();
  await page
    .getByRole("combobox", { name: "Where is it based?" })
    .selectOption({ index: 1 });
  await page.getByRole("radio", { name: /We travel to customers/ }).check();
  await page.getByRole("button", { name: "Create my starter website" }).click();
  await expect(page).toHaveURL(/\/dashboard\/business\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

test.describe.configure({ mode: "serial" });

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/share`,
  );
  await expect(page).toHaveURL(/\/login/);
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/share/print/poster`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner shares a published page with labelled links, sheets and pictures", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await signIn(page);
  const name = `Share Kit Test ${Date.now()}`;
  const businessId = await createBusiness(page, name);

  // Bad ids and another business are not reachable.
  for (const path of [
    "/dashboard/business/not-a-real-id/share",
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/share`,
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/share/print/poster`,
  ]) {
    await page.goto(path);
    await expect(page.getByText("We could not find that page.")).toBeVisible();
  }

  // Before the page is live there is nothing to share, and no sheet to print.
  await page.goto(`/dashboard/business/${businessId}`);
  await page
    .getByRole("navigation", { name: "Business dashboard sections" })
    .getByRole("link", { name: "Share", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/business/${businessId}/share$`),
  );
  await expect(
    page.getByRole("heading", { name: "Publish your page first" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.goto(`/dashboard/business/${businessId}/share/print/poster`);
  await expect(page.getByText("We could not find that page.")).toBeVisible();

  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const [found] =
      await sql`select slug from business where id = ${businessId}`;
    const slug = found!.slug as string;
    await sql`update business set status = 'published' where id = ${businessId}`;
    const [site]: { id: string }[] = await sql`
      insert into business_site (business_id, template_key, platform_path, status, published_at)
      values (${businessId}, 'standard', ${`/b/${slug}`}, 'published', now())
      on conflict (business_id) do update set status = 'published', published_at = now()
      returning id`;
    await sql`
      insert into business_publication (business_id, business_site_id, status, published_at)
      values (${businessId}, ${site!.id}, 'published', now())
      on conflict (business_id) do update set status = 'published', published_at = now()`;
    await sql`
      insert into business_location (business_id, place_id, location_type, is_primary, status)
      select ${businessId}, id, 'service_area', true, 'active' from place
      where status = 'active' order by canonical_name limit 1`;

    await page.goto(`/dashboard/business/${businessId}/share`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Share kit" }),
    ).toBeVisible();
    await expectAccessible(page);

    // Every channel has its own labelled link.
    for (const [channel, label] of [
      ["whatsapp", "WhatsApp and messages"],
      ["facebook", "Facebook"],
      ["instagram", "Instagram"],
      ["email", "Email"],
      ["print", "Print"],
    ] as const) {
      await expect(
        page.getByLabel(`Link for ${label}`, { exact: true }),
      ).toHaveValue(new RegExp(`/b/${slug}\\?source=${channel}$`));
    }
    await expect(
      page.getByLabel("Link for Plain link", { exact: true }),
    ).toHaveValue(new RegExp(`/b/${slug}$`));

    // Copying says so.
    await page
      .getByRole("button", { name: "Copy the WhatsApp and messages link" })
      .click();
    await expect(
      page.getByText("Copied", { exact: true }).first(),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      `/b/${slug}?source=whatsapp`,
    );

    // The message follows the chosen language and the hand-off opens the app
    // without sending anything.
    const message = page.locator("#share-message-whatsapp");
    await expect(message).toContainText("Find ");
    await page.getByLabel("Welsh", { exact: true }).check();
    await expect(message).toContainText("Dewch o hyd i");
    const open = page.getByRole("link", { name: "Open in WhatsApp" });
    await expect(open).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=/);
    await expect(open).toHaveAttribute("rel", /noopener/);

    // Printable sheets: a code that points at the labelled address.
    const posterLink = page
      .getByRole("link", { name: /Open A4 poster: English/ })
      .first();
    const popup = page.waitForEvent("popup");
    await posterLink.click();
    const sheet = await popup;
    await sheet.waitForLoadState();
    await expect(sheet.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(
      sheet.getByRole("img", { name: /QR code linking to/ }),
    ).toBeVisible();
    await expect(sheet.getByText("Scan to visit our page")).toBeVisible();
    await expectAccessible(sheet);
    await sheet.goto(
      `/dashboard/business/${businessId}/share/print/cards?lang=cy`,
    );
    await expect(sheet.getByRole("img", { name: /Cod QR/ })).toHaveCount(8);
    await sheet.goto(`/dashboard/business/${businessId}/share/print/nope`);
    await expect(sheet.getByText("We could not find that page.")).toBeVisible();
    await sheet.close();

    // Pictures and the code come back as real files, with safe fallbacks.
    const wide = await page.request.get(`/b/${slug}/share-image`);
    expect(wide.status()).toBe(200);
    expect(wide.headers()["content-type"]).toContain("image/png");
    const story = await page.request.get(`/b/${slug}/share-image?shape=story`);
    expect(story.status()).toBe(200);
    const odd = await page.request.get(`/b/${slug}/share-image?shape=../x`);
    expect(odd.status()).toBe(200);
    const missing = await page.request.get(`/b/no-such-business/share-image`);
    expect(missing.status()).toBe(404);
    const qr = await page.request.get(`/b/${slug}/qr/image?source=print`);
    expect(await qr.text()).toContain("<svg");
    // A repeated label must not break the public page.
    const repeated = await page.request.get(
      `/b/${slug}?source=qr&source=print`,
    );
    expect(repeated.status()).toBe(200);
    const forged = await page.request.get(
      `/b/${slug}/qr/image?source=%3Cscript%3E`,
    );
    expect(forged.status()).toBe(200);

    // A visit through a labelled link shows up in the results; a forged
    // label does not become one.
    await expect(page.getByText(/^Nothing yet\./)).toBeVisible();
    const visitor = await (await browser.newContext({ baseURL })).newPage();
    const counted = (url: string) =>
      Promise.all([
        // A beacon has no readable response, so wait for the request itself.
        visitor.waitForRequest((request) =>
          request.url().includes("/api/business-activity"),
        ),
        visitor.goto(url),
      ]);
    await counted(`/b/${slug}?source=whatsapp`);
    await counted(`/b/${slug}?source=%3Cscript%3Ealert(1)%3C%2Fscript%3E`);
    await visitor.context().close();
    await expect(async () => {
      await page.reload();
      await expect(
        page.getByText(/1 of 2 visits in the last 30 days came through/),
      ).toBeVisible();
    }).toPass({ timeout: 20_000 });
    await expect(
      page.getByRole("row", { name: /Your WhatsApp and message links 1/ }),
    ).toBeVisible();

    // Without a cover photo the page carries its own share picture.
    const html = await (await page.request.get(`/b/${slug}`)).text();
    expect(html).toContain(`/b/${slug}/share-image`);

    // Welsh interface.
    await page
      .context()
      .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Pecyn rhannu" }),
    ).toBeVisible();
  } finally {
    // The shared account may own only five businesses; leave room for others.
    await sql`delete from business where id = ${businessId}`;
    await sql.end();
  }
});
