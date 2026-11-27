import { expect, test } from "@playwright/test";
import postgres from "postgres";

const businessId = "00000000-0000-4000-8000-000000000401";

test("an empty correction report is stopped with a clear message", async ({
  page,
}) => {
  await page.goto(`/report/${businessId}`);
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.locator("form .field-error")).toContainText(
    "Please say what is wrong, or add a suggested detail, before sending.",
  );
  await expect(page.getByLabel("What should be corrected?")).toBeFocused();
  await expect(page.getByText("Your report has been sent.")).toHaveCount(0);
});

test("a closed-or-moved report needs no further words", async ({ page }) => {
  await page.goto(`/report/${businessId}`);
  await page.getByLabel("What's wrong?").selectOption("closed_or_moved");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("Your report has been sent.")).toBeVisible();
});

test("a business that is not published has no report page", async ({
  page,
}) => {
  const databaseUrl = process.env.DATABASE_URL;
  test.skip(!databaseUrl, "the database is not configured");
  // Own draft business, so the test does not depend on which seeded
  // businesses other specs have already published.
  const draftId = "00000000-0000-4000-8000-00000000fc01";
  const draftName = "Unpublished Report Fixture";
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business where id = ${draftId}`;
    await sql`
      insert into business (id, trading_name, slug, summary, description,
        primary_category_id, business_type, status)
      select ${draftId}, ${draftName}, 'unpublished-report-fixture',
        'Fixture', 'Fixture', primary_category_id, business_type, 'draft'
      from business where id = ${businessId}`;
    const response = await page.goto(`/report/${draftId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText(draftName)).toHaveCount(0);
  } finally {
    await sql`delete from business where id = ${draftId}`;
    await sql.end();
  }
});
