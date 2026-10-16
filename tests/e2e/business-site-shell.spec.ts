import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const path = "/b/cwm-coil-heating";

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows a sticky action bar with the business's actions and share", async ({
    page,
  }) => {
    await page.goto(path);
    const bar = page.getByRole("navigation", { name: "Quick actions" });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("link").first()).toBeVisible();
    await expect(bar.getByRole("button", { name: "Share" })).toBeVisible();

    // It follows the visitor down the page.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(bar).toBeInViewport();

    // Nothing wider than the screen.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("share copies the link when the system share sheet is missing", async ({
    context,
    page,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined });
    });
    await page.goto(`${path}?source=qr#about`);
    const bar = page.getByRole("navigation", { name: "Quick actions" });
    await bar.getByRole("button", { name: "Share", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Link copied" }),
    ).toHaveCount(1);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(/\/b\/cwm-coil-heating$/);
  });

  test("the phone menu marks the current section too", async ({ page }) => {
    await page.goto(path);
    await page.locator("summary[aria-label='Open navigation menu']").click();
    const links = page
      .getByRole("navigation", { name: "Business page sections" })
      .last()
      .getByRole("link");
    const href = (await links.last().getAttribute("href"))!;
    await page.evaluate(
      (selector) =>
        document.querySelector(selector)?.scrollIntoView({ block: "start" }),
      href,
    );
    await expect(
      page.locator('details a[aria-current="location"]'),
    ).toHaveCount(1);
  });

  test("the bar is in Welsh on a Welsh page", async ({ context, page }) => {
    await context.addCookies([
      { name: "ov-locale", value: "cy", url: "http://127.0.0.1:3200" },
    ]);
    await page.goto(path);
    await expect(
      page
        .getByRole("navigation", { name: "Gweithredoedd cyflym" })
        .getByRole("button", { name: "Rhannu", exact: true }),
    ).toBeVisible();
  });
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("hides the action bar and marks the current section in the nav", async ({
    page,
  }) => {
    await page.goto(path);
    await expect(
      page.getByRole("navigation", { name: "Quick actions" }),
    ).toBeHidden();
    const nav = page.getByRole("navigation", {
      name: "Business page sections",
    });
    const links = nav.getByRole("link");
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    expect(count).toBeGreaterThan(1);
    const target = links.nth(count - 1);
    const href = (await target.getAttribute("href"))!;
    await page.locator(href).scrollIntoViewIfNeeded();
    await page.evaluate(
      (selector) =>
        document.querySelector(selector)?.scrollIntoView({ block: "start" }),
      href,
    );
    await expect(nav.locator('a[aria-current="location"]')).toHaveCount(1);
  });
});
