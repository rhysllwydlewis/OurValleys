import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signInAsAdmin } from "./helpers/admin-session";

test("a signed-out visitor cannot read details freshness", async ({ page }) => {
  const response = await page.goto("/admin/details-freshness");
  expect(response?.status()).toBeLessThan(500);
  await expect(
    page.getByRole("heading", { name: "Details freshness" }),
  ).toHaveCount(0);
  await expect(page.getByText("Never confirmed")).toHaveCount(0);
});

test("an admin opens details freshness from the sidebar and filters it", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "Admin sections" })
    .getByRole("link", { name: "Details freshness" })
    .click();
  await expect(page).toHaveURL(/\/admin\/details-freshness$/);
  await expect(
    page.getByRole("heading", { name: "Details freshness", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByText("Confirmed in the last six months"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "All", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "Overdue", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/details-freshness\?show=overdue$/);
  await expect(
    page.getByRole("link", { name: "Overdue", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  // An unknown filter falls back to the full list instead of failing.
  await page.goto("/admin/details-freshness?show=nonsense");
  await expect(
    page.getByRole("link", { name: "All", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
