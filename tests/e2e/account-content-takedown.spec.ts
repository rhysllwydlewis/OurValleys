import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { signInAsAdmin } from "./helpers/admin-session";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

// Named so it runs before account-settings and homepage specs, which change
// the shared provisioned account's password.
test.skip(
  !email || !password || !adminEmail || !adminPassword || !databaseUrl,
  "provisioned E2E accounts or database are not configured",
);

const offerId = "00000000-0000-4000-8000-00000000fb01";
const draftOfferId = "00000000-0000-4000-8000-00000000fb02";
const updateId = "00000000-0000-4000-8000-00000000fb03";

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

async function createBusiness(page: Page): Promise<string> {
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(`Takedown Test ${Date.now()}`);
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

test.describe("report and take down an offer and an update", () => {
  const sql = postgres(databaseUrl ?? "postgres://invalid", { max: 1 });
  let businessId = "";

  async function clean() {
    await sql`delete from business_offer where id in (${offerId}, ${draftOfferId})`;
    await sql`delete from business_update where id = ${updateId}`;
  }

  test.beforeAll(clean);

  test.afterAll(async () => {
    await clean();
    // The shared account may own only a few businesses; leave room for others.
    if (businessId) await sql`delete from business where id = ${businessId}`;
    await sql.end();
  });

  test("an owner's offer and update are reported by a visitor", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    await signIn(page);
    businessId = await createBusiness(page);
    await sql`update business set status = 'published' where id = ${businessId}`;
    // Public offer and update pages need a primary location to name a place.
    await sql`
      insert into business_location (business_id, place_id, location_type, is_primary, status)
      select ${businessId}, place_id, 'service_area_base', true, 'active'
      from business_location where business_id = '00000000-0000-4000-8000-000000000401'
        and not exists (
          select 1 from business_location where business_id = ${businessId} and is_primary
        )`;
    await sql`
      insert into business_offer (id, business_id, title, description, status)
      values (${offerId}, ${businessId}, 'E2E questionable offer', 'Half price boilers, pay a deposit first.', 'active'),
             (${draftOfferId}, ${businessId}, 'E2E draft offer', 'Not public yet.', 'draft')`;
    await sql`
      insert into business_update (id, business_id, title, body, status, published_at)
      values (${updateId}, ${businessId}, 'E2E questionable update', 'Buy now at a very good price.', 'published', now())`;

    // A visitor who is not signed in.
    const visitor = await browser.newContext();
    const visit = await visitor.newPage();

    await visit.goto(`/offers/${offerId}`);
    await visit.getByRole("link", { name: "Report this offer" }).click();
    await expect(visit).toHaveURL(new RegExp(`/report/offer/${offerId}$`));
    await expect(
      visit.getByRole("heading", { level: 1, name: "E2E questionable offer" }),
    ).toBeVisible();
    await expectAccessible(visit);
    await visit.setViewportSize({ width: 390, height: 844 });
    await expect(
      visit.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).resolves.toBe(true);
    await visit
      .getByLabel("What's wrong?")
      .selectOption({ label: "Misleading, or looks like a scam" });
    await visit
      .getByLabel("What is wrong?")
      .fill("Asks for a deposit before any work.");
    await visit.getByRole("button", { name: "Send report" }).click();
    await expect(
      visit.getByRole("heading", { name: "Your report has been sent." }),
    ).toBeVisible();

    await visit.goto(`/report/update/${updateId}`);
    await expect(
      visit.getByRole("heading", { level: 1, name: "E2E questionable update" }),
    ).toBeVisible();
    await expectAccessible(visit);
    await visit
      .getByLabel("What's wrong?")
      .selectOption({ label: "Spam or unrelated advertising" });
    await visit.getByRole("button", { name: "Send report" }).click();
    await expect(
      visit.getByRole("heading", { name: "Your report has been sent." }),
    ).toBeVisible();

    // Drafts and unknown ids have nothing to report.
    for (const path of [
      `/report/offer/${draftOfferId}`,
      "/report/offer/not-an-id",
      "/report/update/00000000-0000-4000-8000-00000000fbff",
    ]) {
      const response = await visit.goto(path);
      expect(response?.status()).toBe(404);
    }
    await visitor.close();
  });

  test("an administrator removes both; the owner sees them locked; the administrator restores", async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    const admin = await browser.newContext();
    const desk = await admin.newPage();
    await signInAsAdmin(desk, adminEmail!, adminPassword!);

    await desk.goto("/admin/reports?status=open&type=offer");
    await expect(
      desk.getByRole("heading", { name: "Content reports" }),
    ).toBeVisible();
    const offerRow = desk
      .getByRole("row")
      .filter({ hasText: "E2E questionable offer" });
    await expect(offerRow).toContainText("Misleading or a scam");
    await expect(
      desk
        .getByRole("group", { name: "Filter by type" })
        .getByRole("link", { name: "Offers" }),
    ).toHaveAttribute("aria-current", "page");
    await expectAccessible(desk);
    desk.once("dialog", (dialog) => dialog.accept());
    await offerRow
      .getByRole("button", { name: /Remove offer E2E questionable offer/ })
      .click();
    await expect(offerRow).toHaveCount(0);

    await desk.goto("/admin/reports?status=open&type=update");
    const updateRow = desk
      .getByRole("row")
      .filter({ hasText: "E2E questionable update" });
    desk.once("dialog", (dialog) => dialog.accept());
    await updateRow
      .getByRole("button", { name: /Remove update E2E questionable update/ })
      .click();
    await expect(updateRow).toHaveCount(0);

    // Public pages no longer know either.
    await page.goto(`/offers/${offerId}`);
    await expect(page.getByText("We could not find that page.")).toBeVisible();
    expect((await page.goto(`/report/update/${updateId}`))?.status()).toBe(404);

    // The owner sees them locked, with no way to change them.
    await signIn(page);
    await page.goto(`/dashboard/business/${businessId}/offers`);
    await expect(
      page.getByRole("heading", {
        name: /^Removed by an administrator \(1\)$/,
      }),
    ).toBeVisible();
    const ownerOffer = page
      .getByRole("listitem")
      .filter({ hasText: "E2E questionable offer" });
    await expect(
      ownerOffer.getByText("Removed by an administrator after a report"),
    ).toBeVisible();
    await expect(
      ownerOffer.getByRole("button", { name: "Resume" }),
    ).toHaveCount(0);
    await expect(
      ownerOffer.getByRole("button", { name: /Remove/ }),
    ).toHaveCount(0);
    await expectAccessible(page);

    await page.goto(`/dashboard/business/${businessId}/updates`);
    await expect(
      page.getByRole("heading", {
        name: /^Removed by an administrator \(1\)$/,
      }),
    ).toBeVisible();
    const ownerUpdate = page
      .getByRole("listitem")
      .filter({ hasText: "E2E questionable update" });
    await expect(
      ownerUpdate.getByRole("button", { name: /Publish/ }),
    ).toHaveCount(0);
    await expectAccessible(page);

    // The administrator restores both: neither is public, the owner decides.
    await desk.goto("/admin/reports?status=resolved&type=offer");
    desk.once("dialog", (dialog) => dialog.accept());
    await desk
      .getByRole("row")
      .filter({ hasText: "E2E questionable offer" })
      .getByRole("button", { name: /Restore offer/ })
      .click();
    await expect(
      desk
        .getByRole("row")
        .filter({ hasText: "E2E questionable offer" })
        .getByRole("button", { name: /Restore offer/ }),
    ).toHaveCount(0);
    await page.goto(`/offers/${offerId}`);
    await expect(page.getByText("We could not find that page.")).toBeVisible();
    await page.goto(`/dashboard/business/${businessId}/offers`);
    await expect(
      page.getByRole("heading", { name: /^Paused \(1\)$/ }),
    ).toBeVisible();
    await admin.close();
  });
});
