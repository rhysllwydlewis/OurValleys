import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.skip(!email || !password, "provisioned E2E admin is not configured");

const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Admin sections" });

test("the admin sections are grouped in a sidebar that marks the current one and keeps the header on one line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin");

  for (const group of [
    "Businesses",
    "Trust and safety",
    "Places and stories",
    "Platform",
  ]) {
    await expect(nav(page).getByRole("list", { name: group })).toBeVisible();
  }

  // Places and Place suggestions share a prefix; only the open one is current.
  await nav(page).getByRole("link", { name: "Place suggestions" }).click();
  await expect(page).toHaveURL(/\/admin\/place-suggestions$/);
  await expect(
    nav(page).getByRole("link", { name: "Place suggestions" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav(page).getByRole("link", { name: "Places" }),
  ).not.toHaveAttribute("aria-current", "page");
  await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(1);

  // The sidebar sits beside the page.
  const navBox = (await nav(page).boundingBox())!;
  const headingBox = (await page
    .getByRole("heading", { level: 1, name: "Admin" })
    .boundingBox())!;
  expect(navBox.x + navBox.width).toBeLessThanOrEqual(headingBox.x);

  // With the extra Admin link the site header still fits on one line.
  const primary = page.getByRole("navigation", { name: "Primary navigation" });
  const first = (await primary.getByRole("link").first().boundingBox())!;
  const admin = (await primary
    .getByRole("link", { name: "Admin", exact: true })
    .boundingBox())!;
  expect(Math.abs(admin.y - first.y)).toBeLessThan(4);

  const results = await new AxeBuilder({ page })
    .include('nav[aria-label="Admin sections"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
