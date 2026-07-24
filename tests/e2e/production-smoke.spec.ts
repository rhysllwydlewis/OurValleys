import { expect, test } from "@playwright/test";
import { publicDemoAccount } from "../../src/lib/demo-account";

test.describe("deployed OurValleys origin", () => {
  test("reports live and ready dependencies", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.status()).toBe(200);
    await expect(health.json()).resolves.toMatchObject({ status: "ok" });

    const readiness = await request.get("/api/ready");
    expect(readiness.status()).toBe(200);
    await expect(readiness.json()).resolves.toMatchObject({ status: "ready" });
  });

  test("serves the connected public discovery routes", async ({ page }) => {
    for (const path of [
      "/",
      "/businesses",
      "/places",
      "/categories",
      "/events",
      "/guides",
      "/news",
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should render`).toBe(200);
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });

  test("retained viewer demonstration stays read-only", async ({ page }) => {
    await page.goto("/login");
    const fillButton = page.getByRole("button", {
      name: publicDemoAccount.buttonLabel,
    });
    test.skip((await fillButton.count()) === 0, "Viewer demo is disabled.");

    await fillButton.click();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(
      page.getByRole("link", { name: "Open business dashboard" }),
    ).toBeVisible();

    const dashboardLink = page.getByRole("link", {
      name: "Open business dashboard",
    });
    await dashboardLink.click();
    await expect(page.getByText("View only", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save profile draft" }),
    ).toHaveCount(0);
  });
});
