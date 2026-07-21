import { expect, test } from "@playwright/test";

test("the homepage header exposes a keyboard skip link to the main content", async ({
  page,
}) => {
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  await skipLink.click();
  await expect(page.locator("#main-content")).toBeFocused();
});

test("the global site header exposes a keyboard skip link to the main content", async ({
  page,
}) => {
  await page.goto("/businesses");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toHaveAttribute("href", "#main-content");

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  await skipLink.click();
  await expect(page.locator("#main-content")).toBeFocused();
});
