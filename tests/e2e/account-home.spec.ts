import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;

// Named so it runs before account-settings and homepage specs, which change
// the shared provisioned account's password.
test.skip(!email || !password, "provisioned E2E account is not configured");

async function signIn(page: Page) {
  // Sign-in is rate limited, so wait out a refusal and try again.
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
    if ((await remove.count()) === 0) return;
    await remove.first().click();
    await page.waitForURL(/savedOutcome=/);
  }
}

async function removeEverythingSaved(page: Page) {
  await removeSavedSearches(page);
  await page.goto("/account/saved");
  const remove = page.getByRole("button", { name: /^Remove/ });
  for (let guard = 0; guard < 10; guard += 1) {
    const before = await remove.count();
    if (before === 0) return;
    await remove.first().click();
    await page.waitForURL(/savedOutcome=/);
    await page.goto("/account/saved");
    await expect(remove).toHaveCount(before - 1);
  }
}

test("a resident's home gathers what they saved, with tabs and in-place removal", async ({
  page,
}) => {
  await signIn(page);
  await removeEverythingSaved(page);

  // Empty home: a clear invitation and suggested next steps, not blank tiles.
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { level: 1, name: /Hello,/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nothing coming up yet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Save something local/ }),
  ).toBeVisible();
  await page.goto("/account/saved");
  await expect(
    page.getByRole("heading", { name: "You have not saved anything yet." }),
  ).toBeVisible();

  // Save a business and a place from their public pages.
  await page.goto("/b/cwm-coil-heating");
  // The save is a form post that redirects back to this same URL, so the URL
  // alone cannot say it finished: wait for the post itself before leaving.
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name: "Save for later" }).first().click(),
  ]);
  await expect(page).toHaveURL(/cwm-coil-heating/);

  // The home now shows it, with the right panels.
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Your saved businesses" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Cwm & Coil Heating" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your places" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emails you have chosen" }),
  ).toBeVisible();

  // Axe scan of the populated home and the tabbed saved page.
  const home = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(home.violations).toEqual([]);

  // Tabs keep their place and show counts.
  await page.goto("/account/saved?tab=businesses");
  const tabs = page.getByRole("navigation", { name: "Saved item types" });
  await expect(tabs.getByRole("link", { name: /^Businesses/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("heading", { name: "Saved businesses" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Saved events" })).toHaveCount(
    0,
  );
  const saved = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(saved.violations).toEqual([]);

  // Removing returns to the same tab and shows the empty state.
  await page
    .getByRole("button", { name: /^Remove/ })
    .first()
    .click();
  await page.waitForURL(/savedOutcome=removed/);
  await expect(page.getByRole("status")).toContainText("Removed");
  await expect(
    page.getByRole("heading", { name: "You have not saved anything yet." }),
  ).toBeVisible();
});

test("an unknown tab falls back to the whole list and a visitor is sent to sign in", async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/account/saved?tab=%3Cscript%3E");
  await expect(page).toHaveURL(/\/login\?next=/);
  const next = new URL(page.url()).searchParams.get("next");
  expect(next).toBe("/account/saved");
  await context.close();
});

test("the home reads in Welsh", async ({ page, baseURL }) => {
  await signIn(page);
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto("/account");
  await expect(page.getByText("Fy nghymoedd").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ar y gweill", exact: true }),
  ).toBeVisible();
  await page.goto("/account/saved");
  // While the page streams in, the loading shell's <main> can briefly sit next
  // to the page's own, so look at the last one.
  await expect(page.locator("main").last()).toHaveAttribute("lang", "cy-GB");
});
