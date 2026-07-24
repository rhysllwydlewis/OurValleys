import { expect, test } from "@playwright/test";
import {
  publicAdminDemoAccount,
  publicBusinessDemoAccount,
  publicDemoAccount,
} from "../../src/lib/demo-account";

test.describe("deployed OurValleys origin", () => {
  test.skip(
    process.env.PRODUCTION_SMOKE !== "true",
    "Deployment-only checks run through the Production smoke workflow.",
  );

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

  test("publishes a coherent public indexing boundary", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const robotsBody = await robots.text();
    expect(robotsBody).toContain("Sitemap:");
    expect(robotsBody).not.toContain("Disallow: /");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain("/policies/privacy");
    expect(sitemapBody).not.toContain("/places");
    expect(sitemapBody).not.toContain("/categories");
    expect(sitemapBody).not.toContain("/events");
    expect(sitemapBody).not.toContain("/guides");
    expect(sitemapBody).not.toContain("/b/cwm-coil-heating");
  });

  test("retains only the read-only viewer demonstration", async ({ page }) => {
    await page.goto("/login");
    const viewerButton = page.getByRole("button", {
      name: publicDemoAccount.buttonLabel,
    });
    await expect(viewerButton).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: publicBusinessDemoAccount.buttonLabel,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: publicAdminDemoAccount.buttonLabel }),
    ).toHaveCount(0);

    await viewerButton.click();
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
