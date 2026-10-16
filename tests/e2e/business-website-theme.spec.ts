import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  "/b/cwm-coil-heating",
  "/b/cwm-coil-heating/menu",
  "/b/cwm-coil-heating/contact",
  "/b/cwm-coil-heating/qr",
];

for (const path of pages) {
  test(`${path} carries an approved template, corner and typeface`, async ({
    page,
  }) => {
    await page.goto(path);
    const site = page.locator("[data-template][data-corners][data-typeface]");
    await expect(site.first()).toBeVisible();
    const template = await site.first().getAttribute("data-template");
    expect([
      "standard",
      "warm",
      "bold",
      "editorial",
      "immersive",
      "simple",
    ]).toContain(template);
    expect(["soft", "square", "round"]).toContain(
      await site.first().getAttribute("data-corners"),
    );
    expect(["classic", "modern"]).toContain(
      await site.first().getAttribute("data-typeface"),
    );
  });
}

test("the business website has no horizontal scroll and no axe violations at phone width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/b/cwm-coil-heating");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
