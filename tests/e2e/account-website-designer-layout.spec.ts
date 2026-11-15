import AxeBuilder from "@axe-core/playwright";
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

test("the website designer keeps its controls beside the sidebar and previews unsaved choices", async ({
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

  // The studio: the real page beside the controls, following every choice.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/dashboard/business/${businessId}/website`);
  const preview = page.getByRole("complementary", { name: "Live preview" });
  const frame = preview.frameLocator("iframe[title]");
  // The private preview may be framed by this site (and only this route).
  await expect(frame.locator("[data-template]")).toHaveAttribute(
    "data-template",
    "bold",
  );
  const status = page
    .getByRole("status")
    .filter({ hasText: /^(Everything is saved|Unsaved changes|Saving…)$/ });
  await expect(status).toHaveText("Everything is saved");

  // An unsaved choice shows in the preview and is flagged as unsaved.
  // (The radio itself is visually hidden inside its card, so click the card.)
  await page.locator("label", { hasText: "Quiet editorial" }).click();
  await expect(status).toHaveText("Unsaved changes");
  await expect(frame.locator("[data-template]")).toHaveAttribute(
    "data-template",
    "editorial",
  );

  // Hiding a section removes it from the preview; nothing is saved yet.
  await expect(frame.locator("#services")).toBeAttached();
  await page.getByRole("checkbox", { name: "Show Services" }).uncheck();
  await expect(frame.locator("#services")).toHaveCount(0);

  // The device buttons change the width the page is laid out at.
  await page.getByRole("button", { name: "Mobile" }).click();
  await expect(preview.locator("iframe[title]")).toHaveCSS("width", "390px");
  await page.getByRole("button", { name: "Desktop" }).click();
  await expect(preview.locator("iframe[title]")).toHaveCSS("width", "1280px");

  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations.map((violation) => violation.id)).toEqual([]);

  // Saving keeps the choices and clears the unsaved flag.
  await page.getByRole("button", { name: "Save appearance" }).click();
  await expect(page).toHaveURL(/outcome=saved/);
  await expect(
    page.getByRole("radio", { name: /Quiet editorial/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Show Services" }),
  ).not.toBeChecked();
  await expect(status).toHaveText("Everything is saved");

  // Resetting returns the controls themselves to the suggested design, not
  // just the saved record.
  await page
    .getByRole("button", { name: "Reset to the suggested design" })
    .click();
  await expect(page).toHaveURL(/outcome=reset/);
  await expect(
    page.getByRole("radio", { name: /Bold & direct/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Show Services" }),
  ).toBeChecked();
  await expect(status).toHaveText("Everything is saved");

  // On a phone the preview is a sheet opened from the action bar, and
  // closing it returns to the button that opened it.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/dashboard/business/${businessId}/website`);
  await expect(preview).toBeHidden();
  const opener = page.getByRole("link", { name: "Live preview" });
  await opener.click();
  const sheet = page.getByRole("dialog", { name: "Live preview" });
  await expect(sheet).toBeVisible();
  await expect(
    sheet.frameLocator("iframe[title]").locator("[data-template]"),
  ).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});
