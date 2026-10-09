import { expect, test } from "@playwright/test";

const PRINTABLE_PAGES = [
  { name: "guide", path: "/guides/independent-coffee-across-the-valleys" },
  { name: "event", path: "/events/00000000-0000-4000-8000-000000001201" },
  { name: "business", path: "/b/cwm-coil-heating" },
  { name: "offers", path: "/offers" },
];

for (const { name, path } of PRINTABLE_PAGES) {
  test(`the ${name} page prints without site chrome`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("header").first()).toBeVisible();

    await page.emulateMedia({ media: "print" });

    const visibleChrome = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'header, footer, [data-print="hide"], a[href="#main-content"]',
        ),
      ]
        .filter((el) => getComputedStyle(el).display !== "none")
        .map((el) => el.tagName.toLowerCase()),
    );
    expect(visibleChrome).toEqual([]);
    await expect(page.locator("h1").first()).toBeVisible();
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(background).toBe("rgb(255, 255, 255)");
  });
}
