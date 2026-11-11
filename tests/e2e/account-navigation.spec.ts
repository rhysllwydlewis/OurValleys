import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { publicDemoAccount } from "../../src/lib/demo-account";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;

// Named so it runs before account-settings and homepage specs, which change
// the shared provisioned account's password.

async function signIn(page: Page, who: { email: string; password: string }) {
  for (let attempt = 1; ; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(who.email);
    await page.getByLabel("Password").fill(who.password);
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

const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Your account" });

test.describe("resident", () => {
  test.skip(!email || !password, "provisioned E2E account is not configured");

  test("one account navigation joins every account page and marks the current one", async ({
    page,
  }) => {
    await signIn(page, { email: email!, password: password! });

    await expect(
      nav(page).getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("aria-current", "page");

    const journey: [string, RegExp, string][] = [
      ["Saved", /\/account\/saved$/, "Saved items"],
      ["From your businesses", /\/account\/following$/, "From your businesses"],
      ["Notifications", /\/account\/notifications$/, "Notifications"],
      ["Privacy and notices", /\/account\/privacy$/, "Privacy and notices"],
      ["Settings", /\/account\/settings$/, "Account settings"],
    ];
    for (const [label, url, heading] of journey) {
      await nav(page).getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(url);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(
        nav(page).getByRole("link", { name: label, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      // Only the current page is marked.
      await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(1);
    }

    await nav(page).getByRole("link", { name: "Overview" }).click();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("the account navigation passes axe and does not scroll a phone sideways", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, { email: email!, password: password! });
    await page.goto("/account/privacy");
    await expect(nav(page)).toBeVisible();
    // The current page's link is brought into view inside the strip.
    await expect(
      nav(page).getByRole("link", { name: "Privacy and notices" }),
    ).toBeInViewport();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);

    const results = await new AxeBuilder({ page })
      .include('nav[aria-label="Your account"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});

test("a public demo account gets the navigation without a settings link", async ({
  page,
}) => {
  await signIn(page, publicDemoAccount);
  await expect(nav(page)).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Saved" })).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Settings" })).toHaveCount(
    0,
  );
});

test("signed-out visitors do not see the account navigation", async ({
  page,
}) => {
  await page.goto("/account/saved");
  await expect(page).toHaveURL(/\/login/);
  await expect(nav(page)).toHaveCount(0);
});
