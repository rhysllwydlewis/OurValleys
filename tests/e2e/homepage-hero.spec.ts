import { expect, test } from "@playwright/test";

test.describe("homepage hero", () => {
  test("search and quick actions are usable immediately, without scrolling", async ({
    page,
  }) => {
    await page.goto("/");

    const search = page.getByRole("searchbox", {
      name: "What are you looking for?",
    });

    await expect(search).toBeVisible();
    await search.fill("coffee");
    await expect(search).toHaveValue("coffee");

    await expect(
      page.getByRole("link", { name: "Find a business" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "See what’s on" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explore places" }),
    ).toBeVisible();
  });

  test("shows exactly one accessible preview card, and it cycles automatically", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("[data-home-hero]")).toHaveAttribute(
      "data-motion",
      "auto",
    );

    const activeCards = page.locator('[data-hero-card][aria-hidden="false"]');
    await expect(activeCards).toHaveCount(1);
    await expect(activeCards.first()).toBeVisible();
    await expect(activeCards.first().getByRole("link")).toHaveAttribute(
      "href",
      /.+/,
    );

    const initialActive = await activeCards
      .first()
      .getAttribute("data-card-kind");

    await expect
      .poll(
        async () =>
          page
            .locator('[data-hero-card][aria-hidden="false"]')
            .first()
            .getAttribute("data-card-kind"),
        { timeout: 10_000, intervals: [250] },
      )
      .not.toBe(initialActive);

    await expect(
      page.locator('[data-hero-card][aria-hidden="false"]'),
    ).toHaveCount(1);
  });

  test("hovering the preview cards pauses automatic cycling", async ({
    page,
  }) => {
    await page.goto("/");

    const cycler = page.getByLabel("Homepage previews");
    await cycler.hover();

    const activeCard = page.locator('[data-hero-card][aria-hidden="false"]');
    const kindBefore = await activeCard.getAttribute("data-card-kind");

    await page.waitForTimeout(6_500);

    await expect(activeCard).toHaveAttribute("data-card-kind", kindBefore!);
  });

  test("preview dots jump directly to a card", async ({ page }) => {
    await page.goto("/");

    const dots = page.getByLabel("Homepage previews").getByRole("button");
    await dots.nth(2).click();

    const activeCards = page.locator('[data-hero-card][aria-hidden="false"]');
    await expect(activeCards).toHaveCount(1);
    await expect(dots.nth(2)).toHaveAttribute("data-current", "true");
  });

  test("quick actions point to existing journeys", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: "Find a business" }),
    ).toHaveAttribute("href", "/businesses");
    await expect(
      page.getByRole("link", { name: "See what’s on" }),
    ).toHaveAttribute("href", "/events");
    await expect(
      page.getByRole("link", { name: "Explore places" }),
    ).toHaveAttribute("href", "/places");
  });

  test("keeps area selection and avoids horizontal overflow on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByLabel("Where?")).toBeVisible();

    const hero = await page.locator("[data-home-hero]").boundingBox();
    expect(hero).not.toBeNull();
    expect(hero?.height).toBeGreaterThanOrEqual(844 * 0.95);
    expect(hero?.height).toBeLessThanOrEqual(844 * 1.05);

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));

    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  });

  test("has no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/");

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));

    expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  });

  test("reduced motion leaves a static, single-card hero", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.getByRole("searchbox").first()).toBeVisible();
    await expect(page.locator("[data-home-hero]")).toHaveAttribute(
      "data-motion",
      "reduced",
    );

    const activeCards = page.locator('[data-hero-card][aria-hidden="false"]');
    await expect(activeCards).toHaveCount(1);

    await page.waitForTimeout(6_000);
    await expect(
      page.locator('[data-hero-card][aria-hidden="false"]'),
    ).toHaveCount(1);
  });
});
