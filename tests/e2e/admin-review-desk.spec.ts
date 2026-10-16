import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

test("signed-out visitors cannot reach the review desk", async ({ page }) => {
  await page.goto("/admin/queue");
  await expect(page).toHaveURL(/\/login\?next=(?:\/|%2F)admin$/i);
});

test("a suggestion lands on the review desk and can be resolved in place", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );
  const name = `Desk Test Cafe ${Date.now()}`;

  await page.goto("/suggest-a-business");
  await page.locator("#suggest-name").fill(name);
  await page.locator("#suggest-place").fill("Tonypandy");
  await page.locator("#suggest-category").fill("Cafe");
  await page.getByRole("button", { name: "Send suggestion" }).click();
  await expect(page.getByText("has been received.")).toBeVisible();

  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin/queue");
  await expect(
    page.getByRole("heading", { name: "Review desk", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /^Review desk/, includeHidden: false }),
  ).toHaveAttribute("aria-current", "page");

  const card = page.getByRole("listitem").filter({ hasText: name });
  await expect(card).toBeVisible();
  await expect(card.getByText("Suggested business")).toBeVisible();

  await page.goto("/admin/queue?kind=report");
  await expect(card).toHaveCount(0);
  await page.goto("/admin/queue?kind=suggestion");
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Already listed" }).click();
  await expect(card).toHaveCount(0);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Needs you" })).toBeVisible();

  // Unknown filters fall back to the full desk instead of breaking.
  await page.goto("/admin/queue?kind=%3Cscript%3E&urgency=nope");
  await expect(page.getByRole("link", { name: "All kinds" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // A phone-width desk neither scrolls sideways nor breaks WCAG A/AA.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/queue");
  await expect(
    page.getByRole("heading", { name: "Review desk", level: 2 }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
