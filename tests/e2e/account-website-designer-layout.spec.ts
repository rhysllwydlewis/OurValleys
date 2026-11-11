import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

// Named so it runs before account-settings and homepage specs, which change
// the shared provisioned account's password.
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

let businessId: string | null = null;

test.afterAll(async () => {
  if (!businessId) return;
  // The account may own only a few businesses; give this one back.
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business where id = ${businessId}`;
  } finally {
    await sql.end();
  }
});

test("the website designer's section controls stay inside the form beside the dashboard sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(`Designer Test ${Date.now()}`);
  await page.getByLabel("Narrow the categories").fill("plumb");
  await page.getByRole("radio", { name: /Plumbing/ }).check();
  await page
    .getByRole("combobox", { name: "Where is it based?" })
    .selectOption({ index: 1 });
  await page.getByRole("radio", { name: /We travel to customers/ }).check();
  await page.getByRole("button", { name: "Create my starter website" }).click();
  await expect(page).toHaveURL(/\/dashboard\/business\/[0-9a-f-]{36}$/);
  businessId = page.url().split("/").pop()!;

  for (const width of [1100, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/dashboard/business/${businessId}/website`);
    const nav = page.getByRole("navigation", {
      name: "Business dashboard sections",
    });
    await expect(
      nav.getByRole("link", { name: "Website design" }),
    ).toHaveAttribute("aria-current", "page");

    const overflow = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("form ol > li")];
      return {
        rows: rows.length,
        // Any section row (with its layout picker and move buttons) wider
        // than the form that holds it.
        spill: rows.filter((row) => {
          const form = row.closest("form")!;
          return (
            row.getBoundingClientRect().right >
            form.getBoundingClientRect().right + 1
          );
        }).length,
        pageScroll: document.documentElement.scrollWidth > window.innerWidth,
      };
    });
    expect(overflow.rows, `section rows at ${width}px`).toBeGreaterThan(0);
    expect(overflow.spill, `rows spilling at ${width}px`).toBe(0);
    expect(overflow.pageScroll, `page scroll at ${width}px`).toBe(false);

    // The editor sits beside the sidebar, never underneath it.
    const navBox = await nav.boundingBox();
    const formBox = await page
      .locator("form:has(ol > li)")
      .first()
      .boundingBox();
    expect(formBox!.x).toBeGreaterThanOrEqual(navBox!.x + navBox!.width);
  }
});
