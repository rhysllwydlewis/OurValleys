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
    const robotsDirectives = robotsBody
      .split(/\r?\n/)
      .map((line) => line.trim());
    expect(robotsBody).toContain("Sitemap:");
    expect(robotsDirectives).not.toContain("Disallow: /");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain("/policies/privacy");
    expect(sitemapBody).not.toMatch(/\/places<\/loc>/);
    expect(sitemapBody).not.toContain("/categories");
    expect(sitemapBody).not.toContain("/events");
    expect(sitemapBody).not.toContain("/guides");
    expect(sitemapBody).not.toContain("/b/cwm-coil-heating");
  });

  test("retains only the read-only viewer demonstration", async ({ page }) => {
    await page.goto("/login");
    // Whatever the mode, the owner and administrator demos are never offered.
    await expect(
      page.getByRole("button", {
        name: publicBusinessDemoAccount.buttonLabel,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: publicAdminDemoAccount.buttonLabel }),
    ).toHaveCount(0);
    // No chooser either: there is nothing else to switch to.
    await expect(
      page.getByRole("group", { name: "Demonstration account" }),
    ).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);

    const viewerButton = page.getByRole("button", {
      name: publicDemoAccount.buttonLabel,
    });
    if ((await viewerButton.count()) === 0) {
      // OURVALLEYS_DEMO_CODE is set: the viewer is offered only after the code
      // is typed, so the page must offer the code prompt instead, and must not
      // print the demonstration credentials.
      await expect(page.getByText("Have a demo code?")).toBeVisible();
      await expect(page.locator("body")).not.toContainText(
        publicDemoAccount.email,
      );
      await expect(page.locator("body")).not.toContainText(
        publicDemoAccount.password,
      );
      // Signing in as the viewer through the demo code is covered by the next
      // test; the code itself is a secret this workflow does not hold.
      return;
    }
    await expect(viewerButton).toBeVisible();

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

  test("the retired demo accounts are gone and the viewer still signs in", async ({
    request,
  }) => {
    // A demo sign-in must ask for a non-persistent session
    // (`src/app/api/auth/[...all]/route.ts`); without it the server answers 403
    // before looking anything up, which would prove nothing about the account.
    //
    // Better Auth also allows only three sign-ins per address in ten seconds,
    // and the viewer test above may already have used one. A throttled request
    // (429) is retried after the window, a bounded number of times, so a
    // healthy deployment is never failed for being checked quickly.
    test.setTimeout(90_000);
    const signIn = async (account: { email: string; password: string }) => {
      for (let attempt = 0; ; attempt += 1) {
        const response = await request.post("/api/auth/sign-in/email", {
          data: { ...account, rememberMe: false },
        });
        if (response.status() !== 429 || attempt === 3) return response;
        const retryAfter = Number(response.headers()["x-retry-after"]);
        const seconds =
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 11;
        await new Promise((resolve) =>
          setTimeout(resolve, seconds * 1000 + 250),
        );
      }
    };

    // The business-owner and administrator identities were deleted at the
    // public release (`docs/119` section 9). Only an absent account answers
    // with invalid credentials.
    for (const account of [publicBusinessDemoAccount, publicAdminDemoAccount]) {
      const response = await signIn(account);
      expect(response.status(), account.email).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        code: "INVALID_EMAIL_OR_PASSWORD",
      });
    }

    const viewer = await signIn(publicDemoAccount);
    expect(viewer.status()).toBe(200);
  });
});
