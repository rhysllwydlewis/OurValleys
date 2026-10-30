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
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/updates`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner writes, publishes and withdraws updates that readers see", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  const name = `Updates Test ${Date.now()}`;
  const businessId = await createBusiness(page, name);

  // Bad ids and another business are not reachable.
  await page.goto("/dashboard/business/not-a-real-id/updates");
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/updates`,
  );
  await expect(page.getByText("We could not find that page.")).toBeVisible();

  await page.goto(`/dashboard/business/${businessId}`);
  await page
    .getByRole("navigation", { name: "Business dashboard sections" })
    .getByRole("link", { name: "Updates", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/business/${businessId}/updates$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Updates" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No updates yet" }),
  ).toBeVisible();
  await expectAccessible(page);

  // The live preview follows what is typed.
  await page.getByLabel("Headline").first().fill("Closed on Monday");
  const preview = page.getByRole("complementary", { name: "How it reads" });
  await expect(preview.getByText("Closed on Monday")).toBeVisible();

  // A refused form names the fields and keeps what was typed.
  await page.getByLabel("Update", { exact: true }).first().fill("short");
  await page.getByLabel("Welsh headline").first().fill("Ar gau ddydd Llun");
  await page.getByRole("button", { name: "Publish now" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Some things need fixing",
  );
  await expect(
    page.getByText("Write at least 10 characters of text."),
  ).toBeVisible();
  await expect(
    page.getByText("Add the Welsh text, or clear the Welsh headline."),
  ).toBeVisible();
  await expect(page.getByLabel("Headline").first()).toHaveValue(
    "Closed on Monday",
  );

  // Fix it, with Welsh, and save a draft first.
  await page
    .getByLabel("Update", { exact: true })
    .first()
    .fill("We are closed on Monday for training.\n\nBack on Tuesday at nine.");
  await page
    .getByLabel("Welsh text")
    .first()
    .fill("Rydym ar gau ddydd Llun ar gyfer hyfforddiant.");
  await page.getByRole("button", { name: "Save as draft" }).click();
  await expect(page.getByRole("status").first()).toContainText("Draft saved.");
  await expect(
    page.getByRole("heading", { name: /^Drafts \(1\)$/ }),
  ).toBeVisible();
  const row = page.locator("li[id^='update-']").first();
  await expect(row).toContainText("Closed on Monday");
  await expect(row).toContainText("Welsh added");
  await expect(row).toContainText("This draft is ready to publish.");

  // The draft is not public: the business is not even published yet, and the
  // feed does not list it.
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const [found] =
      await sql`select slug from business where id = ${businessId}`;
    const slug = found!.slug as string;
    await sql`update business set status = 'published' where id = ${businessId}`;
    // A starter site has no site or publication rows until it is submitted.
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
    const visitor = await (await browser.newContext({ baseURL })).newPage();
    await visitor.goto(`/b/${slug}/updates`);
    await expect(
      visitor.getByText("This published business page does not exist."),
    ).toBeVisible();
    await visitor.goto(`/updates?q=${encodeURIComponent("Closed on Monday")}`);
    await expect(
      visitor.getByRole("heading", { name: /No updates/ }),
    ).toBeVisible();

    // Publish from the list.
    await row.getByRole("button", { name: /^Publish/ }).click();
    await expect(page.getByRole("status").first()).toContainText(
      "Published. It is now on your website.",
    );
    await expect(
      page.getByRole("heading", { name: /^Published updates \(1\)$/ }),
    ).toBeVisible();

    // The business website shows it, with a link to all updates only past three.
    await visitor.goto(`/b/${slug}`);
    const section = visitor.locator("#updates");
    await expect(section).toContainText("Closed on Monday");
    await expect(section).toContainText("Back on Tuesday at nine.");
    await expect(visitor.getByRole("link", { name: /See all/ })).toHaveCount(0);
    await visitor.goto(`/b/${slug}/updates`);
    await expect(
      visitor.getByRole("heading", { level: 1, name: `Updates from ${name}` }),
    ).toBeVisible();
    await expectAccessible(visitor);

    // The local feed lists it and filters it.
    await visitor.goto(`/updates?q=${encodeURIComponent("Closed on Monday")}`);
    await expect(
      visitor.getByRole("heading", { level: 3, name: "Closed on Monday" }),
    ).toBeVisible();
    await expectAccessible(visitor);
    await visitor.goto("/updates?q=zzzznomatch");
    await expect(
      visitor.getByRole("heading", { name: /No updates match/ }),
    ).toBeVisible();

    // A Welsh reader gets the owner's Welsh.
    await visitor
      .context()
      .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
    await visitor.goto(`/b/${slug}/updates`);
    await expect(visitor.getByText("Ar gau ddydd Llun").first()).toBeVisible();
    await visitor.goto(`/b/${slug}/updates`);
    await expect(visitor.locator("li[lang='cy-GB']")).toHaveCount(1);

    // Phone width: no sideways scroll on the owner page or the public page.
    await visitor.setViewportSize({ width: 390, height: 844 });
    await visitor.goto(`/b/${slug}/updates`);
    expect(
      await visitor.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
    await expectAccessible(page);
    await page.setViewportSize({ width: 1280, height: 900 });

    // Edit a published update, then withdraw it.
    const published = page.locator("li[id^='update-']").first();
    await published.getByText("Edit", { exact: true }).click();
    await published
      .getByLabel("Headline", { exact: true })
      .fill("Closed on Monday 3 November");
    await published.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      "Changes saved.",
    );
    await page
      .locator("li[id^='update-']")
      .first()
      .getByRole("button", { name: /^Unpublish/ })
      .click();
    await expect(page.getByRole("status").first()).toContainText(
      "Unpublished.",
    );
    await visitor.setViewportSize({ width: 1280, height: 900 });
    await visitor
      .context()
      .addCookies([{ name: "ov-locale", value: "en", url: baseURL! }]);
    await visitor.goto(`/b/${slug}/updates`);
    await expect(
      visitor.getByText("This published business page does not exist."),
    ).toBeVisible();
    await visitor.goto(`/b/${slug}`);
    await expect(visitor.locator("#updates")).toHaveCount(0);

    // Deleting asks first.
    const draft = page.locator("li[id^='update-']").first();
    await draft.getByText("Delete", { exact: true }).click();
    await expect(draft.getByText(/for good/)).toBeVisible();
    await draft
      .getByRole("button", { name: "Yes, delete this update" })
      .click();
    await expect(page.getByRole("status").first()).toContainText(
      "Update deleted.",
    );
    await expect(page.locator("li[id^='update-']")).toHaveCount(0);
    await visitor.context().close();

    // Welsh interface.
    await page
      .context()
      .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Diweddariadau" }),
    ).toBeVisible();
  } finally {
    // The shared account may own only five businesses; leave room for others.
    await sql`delete from business where id = ${businessId}`;
    await sql.end();
  }
});

/** A UK `YYYY-MM-DDTHH:mm` this many minutes from now, as a datetime-local input wants it. */
function londonInput(minutesAhead: number): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(Date.now() + minutesAhead * 60_000));
  return parts.replace(" ", "T");
}

test("an owner schedules an update for later, cancels it, and a picture shows to readers", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  const name = `Scheduled Test ${Date.now()}`;
  const businessId = await createBusiness(page, name);
  await page.goto(`/dashboard/business/${businessId}/updates`);

  const headline = page.getByLabel("Headline").first();
  await headline.fill("Autumn menu starts Monday");
  await page
    .getByLabel("Update", { exact: true })
    .first()
    .fill("Our autumn menu starts on Monday with new seasonal dishes.");

  // A schedule needs a time, and the time must be far enough ahead.
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(
    page.getByText("Choose the date and time to publish."),
  ).toBeVisible();
  await page.getByLabel("Publish on (UK time)").first().fill(londonInput(1));
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(
    page.getByText("Choose a time at least 10 minutes from now."),
  ).toBeVisible();
  await expect(headline).toHaveValue("Autumn menu starts Monday");

  // Without picture storage, the form says so instead of offering an upload.
  await expectAccessible(page);

  // A valid time schedules it and the list shows when it goes live.
  await page
    .getByLabel("Publish on (UK time)")
    .first()
    .fill(londonInput(60 * 48));
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Scheduled. It will go live on its own.",
  );
  await expect(
    page.getByRole("heading", { name: /^Scheduled updates \(1\)$/ }),
  ).toBeVisible();
  const row = page.locator("li[id^='update-']").first();
  await expect(row).toContainText("Autumn menu starts Monday");
  await expect(row).toContainText("Goes live");
  await expectAccessible(page);

  // Phone width: no sideways scroll with the scheduled row open.
  await page.setViewportSize({ width: 390, height: 844 });
  await row.getByText("Edit", { exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1280, height: 900 });

  // Cancelling takes it back to a draft with nothing left on the schedule.
  await row.getByRole("button", { name: /^Cancel schedule/ }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Schedule cancelled.",
  );
  await expect(
    page.getByRole("heading", { name: /^Drafts \(1\)$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Scheduled updates/ }),
  ).toHaveCount(0);

  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    // Publish it directly and give it a picture the way an upload would.
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
    const [media]: { id: string }[] = await sql`
      insert into business_media (business_id, role, storage_key, alt_text, content_type, byte_size)
      values (${businessId}, 'update', ${`business/${businessId}/update/e2e.png`}, 'A bowl of autumn soup', 'image/png', 1000)
      returning id`;
    await sql`
      update business_update set status = 'published', published_at = now(),
        image_media_id = ${media!.id}
      where business_id = ${businessId}`;

    const visitor = await (await browser.newContext({ baseURL })).newPage();
    await visitor.goto(`/b/${slug}/updates`);
    await expect(
      visitor.getByRole("img", { name: "A bowl of autumn soup" }),
    ).toBeVisible();
    await expectAccessible(visitor);
    await visitor.goto(
      `/updates?q=${encodeURIComponent("Autumn menu starts Monday")}`,
    );
    await expect(
      visitor.getByRole("img", { name: "A bowl of autumn soup" }),
    ).toBeVisible();
    await expectAccessible(visitor);
    await visitor.context().close();

    // The owner's list shows the picture too.
    await page.reload();
    await expect(
      page.getByRole("img", { name: "A bowl of autumn soup" }),
    ).toBeVisible();
  } finally {
    await sql`delete from business where id = ${businessId}`;
    await sql.end();
  }
});
