import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { publicBusinessDemoAccount } from "../../src/lib/demo-account";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

// Named so it runs before the homepage spec, whose "rotate safely" test
// changes the shared provisioned account's password.
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
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

async function createBusiness(page: Page): Promise<string> {
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(`Welsh Test ${Date.now()}`);
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

/** Services reach the table when a site is published, so write two directly. */
async function seedServices(businessId: string) {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`
      insert into service (business_id, name, description, sort_order)
      values
        (${businessId}, 'Boiler service', 'A yearly safety check.', 0),
        (${businessId}, 'Leak repair', 'Fast repairs for dripping pipes.', 1)
      on conflict do nothing`;
  } finally {
    await sql.end();
  }
}

test.describe.configure({ mode: "serial" });

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/welsh`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner writes the Welsh version, sees progress, and loses nothing on an error", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  const businessId = await createBusiness(page);
  await seedServices(businessId);

  // Another business's Welsh editor and a bad id are not reachable.
  await page.goto("/dashboard/business/not-a-real-id/welsh");
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/welsh`,
  );
  await expect(page.getByText("We could not find that page.")).toBeVisible();

  await page.goto(`/dashboard/business/${businessId}`);
  await page
    .getByRole("navigation", { name: "Business dashboard sections" })
    .getByRole("link", { name: "Welsh version" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/business/${businessId}/welsh$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Your website in Welsh" }),
  ).toBeVisible();
  await expect(page.getByText("Nothing translated yet")).toBeVisible();
  await expect(page.getByText("A yearly safety check.")).toBeVisible();
  await expectAccessible(page);

  // Over the limit: the counter warns, the save is refused, typed text stays.
  const summary = page.getByLabel("Cymraeg (Welsh)").first();
  const tooLong = "a".repeat(300);
  await summary.fill(tooLong);
  await expect(page.getByText("300 of 280")).toBeVisible();
  await page.getByRole("button", { name: "Save Welsh version" }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Some fields need attention",
  );
  await expect(summary).toHaveValue(tooLong);
  await expectAccessible(page);

  // The refusal clears as soon as the text is shortened, for sight and for
  // screen readers alike.
  await expect(page.getByText(/This is too long/)).toBeVisible();
  await summary.fill("Plymwr lleol.");
  await expect(page.getByText(/This is too long/)).toHaveCount(0);
  await expect(summary).not.toHaveAttribute("aria-invalid", "true");

  // A valid save.
  await summary.fill("Plymwr lleol yn gwasanaethu’r cymoedd.");
  await page
    .getByLabel("Service name in Welsh")
    .first()
    .fill("Gwasanaeth boeler");
  await page
    .getByLabel("Service description in Welsh")
    .first()
    .fill("Archwiliad diogelwch blynyddol.");
  await page.getByRole("button", { name: "Save Welsh version" }).click();
  await expect(page.getByRole("status").first()).toContainText("Saved.");
  await expect(page.getByText(/\d+ of \d+ parts in Welsh/)).toBeVisible();

  // It persists across a reload.
  await page.reload();
  await expect(page.getByLabel("Cymraeg (Welsh)").first()).toHaveValue(
    "Plymwr lleol yn gwasanaethu’r cymoedd.",
  );
  await expect(page.getByLabel("Service name in Welsh").first()).toHaveValue(
    "Gwasanaeth boeler",
  );

  // Clearing everything puts the page back to English only.
  await page.getByLabel("Cymraeg (Welsh)").first().fill("");
  await page.getByLabel("Service name in Welsh").first().fill("");
  await page.getByLabel("Service description in Welsh").first().fill("");
  // Controlled fields can be reset by hydration; confirm the values stuck.
  await expect(page.getByLabel("Cymraeg (Welsh)").first()).toHaveValue("");
  await expect(page.getByLabel("Service name in Welsh").first()).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Service description in Welsh").first(),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Save Welsh version" }).click();
  await expect(page.getByRole("status").first()).toContainText("English only");

  // Phone width: no sideways scroll, still accessible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});

test("the Welsh interface of the editor and a Welsh reader's business page use the owner's Welsh", async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const sql = postgres(databaseUrl!, { max: 1 });
  let businessId = "";
  try {
    const [row] = await sql`
      select id from business where slug = 'cwm-coil-heating' limit 1`;
    businessId = row!.id as string;
    await sql`
      insert into business_translation (business_id, locale, summary, description)
      values (${businessId}, 'cy', 'Gwres canolog olew a boeleri ar gyfer y cymoedd.', 'Disgrifiad Cymraeg hir.')
      on conflict (business_id, locale) do update
        set summary = excluded.summary, description = excluded.description`;

    // English readers are unaffected.
    await page.goto("/b/cwm-coil-heating");
    await expect(page.getByText("Gwres canolog olew a boeleri")).toHaveCount(0);

    // Welsh readers see the owner's Welsh, tagged as Welsh.
    await context.addCookies([
      { name: "ov-locale", value: "cy", url: baseURL! },
    ]);
    await page.goto("/b/cwm-coil-heating");
    const lead = page
      .getByText("Gwres canolog olew a boeleri ar gyfer y cymoedd.")
      .first();
    await expect(lead).toBeVisible();
    await expect(lead).toHaveAttribute("lang", "cy-GB");
    await expect(page.getByText("Disgrifiad Cymraeg hir.")).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Gwres canolog olew a boeleri ar gyfer y cymoedd.",
    );
    await expectAccessible(page);

    // The directory card and search use it too.
    await page.goto("/businesses?q=boeleri");
    await expect(
      page.getByText("Gwres canolog olew a boeleri ar gyfer y cymoedd."),
    ).toBeVisible();
  } finally {
    if (businessId) {
      await sql`delete from business_translation where business_id = ${businessId}`;
    }
    await sql.end();
  }
});
