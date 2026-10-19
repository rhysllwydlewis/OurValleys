import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const guide = "/guides/a-practical-afternoon-in-porth";

for (const [name, size] of [
  ["desktop", { width: 1440, height: 900 }],
  ["tablet", { width: 820, height: 1100 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test(`a guide reads well and has no accessibility violations at ${name} width`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto(guide);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "In this guide" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Share this guide" }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);

    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations.map((item) => item.id)).toEqual([]);
    }
  });
}

test("the contents list jumps to a section by keyboard", async ({ page }) => {
  await page.goto(guide);
  const contents = page.getByRole("navigation", { name: "In this guide" });
  const link = contents.getByRole("link").nth(1);
  const heading = (await link.textContent())?.trim() ?? "";
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#part-/);
  await expect(
    page.getByRole("heading", { level: 2, name: heading }),
  ).toBeInViewport();
});

test("a guide linked to a place offers that place and other guides to read next", async ({
  page,
}) => {
  await page.goto(guide);
  await expect(
    page.getByRole("link", { name: /Explore Porth/ }),
  ).toHaveAttribute("href", "/places/porth");
  await expect(
    page.getByRole("heading", { name: "More guides to read" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Search businesses" }),
  ).toBeVisible();
});

test.describe("in Welsh", () => {
  test.use({ locale: "cy-GB" });

  test("the text around a guide is Welsh while the guide stays tagged English", async ({
    page,
    baseURL,
  }) => {
    await page
      .context()
      .addCookies([
        { name: "ov-locale", value: "cy", url: baseURL ?? "", httpOnly: true },
      ]);
    await page.goto(guide);
    await expect(
      page.getByRole("navigation", { name: "Yn y canllaw hwn" }),
    ).toBeVisible();
    await expect(page.locator("article")).toHaveAttribute("lang", "en-GB");
    await expect(
      page.getByRole("heading", { name: "Mwy o ganllawiau i’w darllen" }),
    ).toBeVisible();
  });
});

test("reduced motion removes the lift on related guides", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(guide);
  const card = page.getByRole("heading", { name: "More guides to read" });
  await card.scrollIntoViewIfNeeded();
  const transition = await page
    .locator("article ul li")
    .last()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  const longest = Math.max(
    ...transition.split(",").map((part) => Number.parseFloat(part)),
  );
  expect(longest).toBeLessThan(0.001);
});
