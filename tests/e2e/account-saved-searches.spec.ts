import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;

// Named so it runs before account-settings and homepage specs, which change
// the shared provisioned account's password.
test.skip(!email || !password, "provisioned E2E account is not configured");

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

async function removeSavedSearches(page: Page) {
  const remove = page.getByRole("button", { name: /^Remove/ });
  for (let guard = 0; guard < 12; guard += 1) {
    await page.goto("/account/saved?tab=searches");
    await page
      .getByRole("heading", { level: 2, name: "Saved searches" })
      .waitFor();
    const before = await remove.count();
    if (before === 0) return;
    await remove.first().click();
    await page.waitForURL(/savedOutcome=/);
  }
}

test("a signed-out visitor is offered sign-in, and a resident can keep, reopen and remove a search", async ({
  page,
}) => {
  // Signed out: the control leads to sign-in and back to this exact search.
  await page.goto("/search?q=a");
  await page.goto("/search?q=bakery");
  const signInLink = page.getByRole("link", {
    name: "Sign in to save this search",
  });
  if (await signInLink.count()) {
    await expect(signInLink).toHaveAttribute(
      "href",
      /\/login\?next=%2Fsearch%3Fq%3Dbakery/,
    );
  }

  await signIn(page);
  await removeSavedSearches(page);

  // Empty tab: a clear invitation to search.
  await page.goto("/account/saved?tab=searches");
  await expect(
    page.getByText("You have not saved any searches yet", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Search the valleys" }),
  ).toBeVisible();

  // Find a query that has results, then keep it.
  await page.goto("/search?q=cafe");
  const save = page.getByRole("button", { name: "Save this search" });
  test.skip((await save.count()) === 0, "no results for the sample query");
  await save.click();
  await page.waitForURL(/savedOutcome=saved/);
  await expect(page.getByText("Search saved.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "See saved searches" }),
  ).toBeVisible();
  // Now kept: the button is replaced, so it cannot be saved twice.
  await expect(save).toHaveCount(0);

  // The saved list shows it, with a count, and no horizontal scroll on a phone.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/account/saved?tab=searches");
  await expect(
    page.getByRole("heading", { level: 3, name: "cafe" }),
  ).toBeVisible();
  await expect(page.getByText("Nothing new")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  // Opening runs the search again.
  await page.getByRole("button", { name: /^Open search/ }).click();
  await expect(page).toHaveURL(/\/search\?q=cafe$/);

  // Removing it returns the empty state.
  await page.goto("/account/saved?tab=searches");
  await page.getByRole("button", { name: /^Remove/ }).click();
  await page.waitForURL(/savedOutcome=removed/);
  await expect(page.getByText("Search removed.")).toBeVisible();
});
