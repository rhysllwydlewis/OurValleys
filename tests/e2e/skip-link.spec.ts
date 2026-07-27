import { expect, test } from "@playwright/test";

async function expectMainContentFocused(page: Parameters<typeof test>[0]["page"]) {
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

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  await skipLink.press("Enter");
  await expectMainContentFocused(page);
});
