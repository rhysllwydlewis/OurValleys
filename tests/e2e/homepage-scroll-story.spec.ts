import { expect, test } from "@playwright/test";

test.describe("homepage scroll story", () => {
  test("keeps the search usable before scrolling", async ({ page }) => {
    await page.goto("/");

    const search = page.getByRole("searchbox", {
      name: "What are you looking for?",
    });

    await expect(search).toBeVisible();
    await search.fill("coffee");
    await expect(search).toHaveValue("coffee");
  });

  test("reveals exactly one accessible preview card at a time", async ({
    page,
  }) => {
    await page.goto("/");

    // GSAP and ScrollTrigger load asynchronously; wait for the timeline to
    // register before scrolling, otherwise the scroll event fires before
    // anything is listening for it.
    await expect(page.locator("[data-home-scroll-story]")).toHaveAttribute(
      "data-motion",
      "scroll",
    );

    await page.evaluate(() => {
      // Lands inside the first card's accessibility window (progress
      // 0.325-0.42) on both the desktop (+=320%) and mobile (+=220%) scroll
      // ranges; the scrubbed timeline settles onto it shortly after.
      window.scrollTo(0, window.innerHeight * 1.1);
    });

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              document.querySelector<HTMLElement>("[data-home-scroll-story]")
                ?.dataset.activeCard,
          ),
        { timeout: 15_000, intervals: [150] },
      )
      .toBeTruthy();

    const activeCards = page.locator('[data-story-card][aria-hidden="false"]');
    await expect(activeCards).toHaveCount(1);
    await expect(activeCards.first()).toBeVisible();
    await expect(activeCards.first().getByRole("link")).toHaveAttribute(
      "href",
      /.+/,
    );

    const inactiveCards = page.locator('[data-story-card][aria-hidden="true"]');
    const inactiveCount = await inactiveCards.count();
    for (let index = 0; index < inactiveCount; index += 1) {
      await expect(inactiveCards.nth(index)).toHaveAttribute("inert", "");
    }
  });

  test("search becomes inert only once its transition begins", async ({
    page,
  }) => {
    await page.goto("/");

    const search = page.locator("[data-hero-search]");
    await expect(search).not.toHaveAttribute("inert", "");
    await expect(page.locator("[data-home-scroll-story]")).toHaveAttribute(
      "data-motion",
      "scroll",
    );

    await page.evaluate(async () => {
      for (let step = 1; step <= 12; step += 1) {
        window.scrollTo(0, window.innerHeight * step * 0.18);
        await new Promise((resolve) => window.setTimeout(resolve, 45));
        const story = document.querySelector<HTMLElement>(
          "[data-home-scroll-story]",
        );
        if (Number(story?.dataset.scrollProgress ?? 0) > 0.3) return;
      }
    });

    await expect(search).toHaveAttribute("inert", "");
  });

  test("scrolling backwards restores the search and quick actions", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-home-scroll-story]")).toHaveAttribute(
      "data-motion",
      "scroll",
    );

    await page.evaluate(async () => {
      for (let step = 1; step <= 20; step += 1) {
        window.scrollTo(0, window.innerHeight * step * 0.18);
        await new Promise((resolve) => window.setTimeout(resolve, 45));
      }
      window.scrollTo(0, 0);
      await new Promise((resolve) => window.setTimeout(resolve, 200));
    });

    const search = page.locator("[data-hero-search]");
    await expect(search).not.toHaveAttribute("inert", "");
    await expect(
      page.getByRole("link", { name: "Find a business" }),
    ).toBeVisible();
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

    const stage = await page.locator("[data-hero-stage]").boundingBox();
    expect(stage).not.toBeNull();
    expect(stage?.height).toBeGreaterThanOrEqual(844 * 0.95);
    expect(stage?.height).toBeLessThanOrEqual(844 * 1.05);

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

  test("the final card releases cleanly into the next homepage section", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-home-scroll-story]")).toHaveAttribute(
      "data-motion",
      "scroll",
    );

    await page.evaluate(async () => {
      const story = document.querySelector<HTMLElement>(
        "[data-home-scroll-story]",
      );
      if (!story) throw new Error("Scroll story not found");

      for (let step = 1; step <= 40; step += 1) {
        window.scrollTo(0, window.innerHeight * step * 0.15);
        await new Promise((resolve) => window.setTimeout(resolve, 30));
        if (Number(story.dataset.scrollProgress ?? 0) >= 1) return;
      }
    });

    await expect(
      page.getByRole("heading", { name: "What do you need today?" }),
    ).toBeVisible();

    const documentHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(documentHeight).toBeGreaterThan(scrollPosition);
  });

  test("shows the photograph attribution and licence links", async ({
    page,
  }) => {
    await page.goto("/");

    const credit = page.getByText("View from the Bwlch by Alan Hughes");
    await expect(credit).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View from the Bwlch by Alan Hughes" }),
    ).toHaveAttribute(
      "href",
      /commons\.wikimedia\.org\/wiki\/File:View_from_the_Bwlch/,
    );
    await expect(
      page.getByRole("link", { name: "CC BY-SA 2.0" }),
    ).toHaveAttribute(
      "href",
      "https://creativecommons.org/licenses/by-sa/2.0/",
    );
  });

  test("reduced motion leaves a static usable hero", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.getByRole("searchbox").first()).toBeVisible();
    await expect(page.locator("[data-story-card]").first()).toBeHidden();
    await expect(page.locator("[data-home-scroll-story]")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
  });
});
