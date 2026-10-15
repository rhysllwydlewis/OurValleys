import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;

// Named so it runs before the homepage spec, whose "rotate safely" test
// changes the shared provisioned account's password.
test.skip(!email || !password, "provisioned E2E account is not configured");

const pastedMenu = [
  "STARTERS",
  "Leek soup - 5.5 - with bread (v, gf)",
  "Welsh rarebit £6 (v)",
  "MAINS:",
  "Cawl - 12.50 - lamb and root vegetables",
  "Vegan pie 11 (vg)",
  "HOT DRINKS",
  "Tea £2.20",
].join("\n");

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
  await page
    .getByLabel("Business name")
    .fill(`Menu Builder Test ${Date.now()}`);
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

test("an owner builds, edits, reorders and previews a structured menu", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  const businessId = await createBusiness(page);
  await page.goto(`/dashboard/business/${businessId}/operations#menu`);

  const menu = page.locator("section#menu:not([aria-busy])");
  await expect(
    menu.getByRole("heading", { name: "Make your menu better" }),
  ).toBeVisible();
  await expect(menu.getByText("No menu sections yet.")).toBeVisible();

  // Paste a whole menu: headings become sections, tags become labels.
  await menu.getByLabel("Your menu").fill(pastedMenu);
  await menu.getByRole("button", { name: "Build my menu" }).click();
  await expect(page).toHaveURL(/outcome=menu-imported/);
  await expect(page.getByText("Your menu has been built")).toBeVisible();
  await expect(menu.getByRole("heading", { name: "Starters" })).toBeVisible();
  await expect(menu.getByRole("heading", { name: "Mains" })).toBeVisible();
  await expect(menu.getByText("£5.50").first()).toBeVisible();
  await expect(menu.getByText("£11.00").first()).toBeVisible();

  // Edit a dish in place: new price, a label and the favourite flag.
  await menu.getByRole("button", { name: "Edit Cawl" }).click();
  const cawl = menu.getByRole("listitem").filter({ hasText: "Cawl" }).first();
  await cawl.getByLabel("Price (optional)").fill("13");
  await cawl.getByLabel("Dairy free").check();
  await cawl.getByLabel("Show as a house favourite").check();
  await cawl.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Menu updated.")).toBeVisible();
  await expect(menu.getByText("£13.00").first()).toBeVisible();

  // Mark a dish unavailable, then available again.
  await menu
    .getByRole("button", { name: "Mark Cawl as not available today" })
    .click();
  await expect(menu.getByText("Not available", { exact: true })).toBeVisible();
  await menu
    .getByRole("button", { name: "Mark Cawl as available again" })
    .click();
  await expect(menu.getByText("Not available", { exact: true })).toHaveCount(0);

  // Move the Mains section above Starters.
  await menu.getByRole("button", { name: "Move Mains up" }).click();
  await expect(page.getByText("Menu order updated.")).toBeVisible();
  const headings = await menu
    .locator("article h3")
    .evaluateAll((nodes) => nodes.map((node) => node.firstChild?.textContent));
  expect(headings.slice(0, 2)).toEqual(["Mains", "Starters"]);

  // A dish can be removed only after a confirmation.
  await menu.getByRole("button", { name: "Edit Tea" }).click();
  await menu.getByRole("button", { name: "Remove Tea" }).click();
  await menu.getByRole("button", { name: "Yes, remove" }).click();
  await expect(menu.getByText("Tea", { exact: true })).toHaveCount(0);
  await expectAccessible(page);
});

test("the private preview filters the menu by dietary need", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  const businessId = await createBusiness(page);
  await page.goto(`/dashboard/business/${businessId}/operations#menu`);
  await page
    .locator("section#menu:not([aria-busy])")
    .getByLabel("Your menu")
    .fill(pastedMenu);
  await page.getByRole("button", { name: "Build my menu" }).click();
  await expect(page).toHaveURL(/outcome=menu-imported/);

  await page.goto(`/dashboard/business/${businessId}/preview`);
  const preview = page.locator("#menu");
  await expect(preview.getByText("Leek soup")).toBeVisible();
  await expect(
    preview.getByRole("navigation", { name: "Jump to a menu section" }),
  ).toBeVisible();
  await expect(
    preview.getByText("Dietary labels are supplied by the business"),
  ).toBeVisible();

  await preview.getByRole("button", { name: "Vegan", exact: true }).click();
  await expect(preview.getByText("Vegan pie")).toBeVisible();
  await expect(preview.getByText("Leek soup")).toBeHidden();
  await expect(preview.getByText("Showing 1 of 5 dishes")).toBeVisible();
  await preview
    .getByRole("button", { name: "Gluten free", exact: true })
    .click();
  await expect(preview.getByText(/Nothing on this menu matches/)).toBeVisible();
  await preview.getByRole("button", { name: "Clear filters" }).click();
  await expect(preview.getByText("Leek soup")).toBeVisible();
  await expectAccessible(page);
});
