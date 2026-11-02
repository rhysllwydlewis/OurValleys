import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const path = "/b/cwm-coil-heating";

// The seeded demo business is open Monday to Thursday 08:00-17:00, Friday
// 08:00-16:00 and closed at weekends (UK time).
// Fixed time (not fake timers, which would stall hydration), then a
// visibilitychange nudge, which the page treats like returning to the tab.
async function moveClockTo(page: import("@playwright/test").Page, iso: string) {
  await page.clock.setFixedTime(new Date(iso));
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
}

const status = (page: import("@playwright/test").Page) =>
  page.getByTestId("open-status").first();

test.describe("live opening hours", () => {
  test("shows open now, closing soon and closed as the clock moves", async ({
    page,
  }) => {
    // Wednesday 15 July 2026, 11:00 London (BST).
    await page.clock.setFixedTime(new Date("2026-07-15T10:00:00Z"));
    await page.goto(path);
    await expect(status(page)).toHaveText("Open now · closes at 17:00");
    await expect(status(page)).toHaveAttribute("data-status", "open");

    // 16:15: less than an hour left.
    await moveClockTo(page, "2026-07-15T15:15:00Z");
    await expect(status(page)).toHaveText("Closing soon · closes at 17:00");
    await expect(status(page)).toHaveAttribute("data-status", "soon");

    // 17:30: closed until tomorrow morning.
    await moveClockTo(page, "2026-07-15T16:30:00Z");
    await expect(status(page)).toHaveText(
      "Closed now · opens tomorrow at 08:00",
    );
    await expect(status(page)).toHaveAttribute("data-status", "closed");
  });

  test("names the next opening day over a weekend", async ({ page }) => {
    // Saturday 18 July 2026, 11:00 London.
    await page.clock.setFixedTime(new Date("2026-07-18T10:00:00Z"));
    await page.goto(path);
    await expect(status(page)).toHaveText("Closed now · opens Monday at 08:00");
  });

  test("picks out today in the hours list for assistive technology", async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date("2026-07-15T10:00:00Z"));
    await page.goto(path);
    const today = page.locator('#hours [aria-current="date"]');
    await expect(today).toHaveCount(1);
    await expect(today).toContainText("Wednesday");
    await expect(today).toContainText("Today");
    await expect(today).toContainText("08:00–17:00");
  });

  test.describe("phone, Welsh", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("keeps the status readable with no overflow", async ({
      baseURL,
      context,
      page,
    }) => {
      await context.addCookies([
        { name: "ov-locale", value: "cy", url: baseURL! },
      ]);
      await page.clock.setFixedTime(new Date("2026-07-15T10:00:00Z"));
      await page.goto(path);
      await expect(status(page)).toHaveText("Ar agor nawr · yn cau am 17:00");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });

  test("does not animate the open dot when reduced motion is requested", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.setFixedTime(new Date("2026-07-15T10:00:00Z"));
    await page.goto(path);
    const dot = status(page).locator("span").first();
    await expect(dot).toHaveCSS("animation-name", "none");
  });
});
