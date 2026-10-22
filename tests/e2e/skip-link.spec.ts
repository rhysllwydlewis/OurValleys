import { expect, test, type Page } from "@playwright/test";

async function expectMainContentFocused(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id))
    .toBe("main-content");
}

test("the homepage header exposes a keyboard skip link to the main content", async ({
  page,
}) => {
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  await skipLink.press("Enter");
  await expectMainContentFocused(page);
});

test("the global site header exposes a keyboard skip link to the main content", async ({
  page,
}) => {
  await page.goto("/businesses");

  // /businesses renders dynamically, so on a slow server Next can still hold
  // its streaming fallback, which has its own (hidden) header and a duplicate
  // #main-content that the skip link would jump to. Wait for it to be replaced.
  await expect(page.locator("#main-content")).toHaveCount(1);

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  await skipLink.press("Enter");
  await expectMainContentFocused(page);
});
