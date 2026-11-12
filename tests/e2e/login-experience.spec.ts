import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const noSideScroll = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);

test("the sign-in page puts the welcome beside the form on a wide screen and above it on a phone", async ({
  page,
}) => {
  const heading = () =>
    page.getByRole("heading", { level: 1, name: "Sign in to OurValleys." });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  const wideHeading = (await heading().boundingBox())!;
  const wideEmail = (await page.getByLabel("Email address").boundingBox())!;
  expect(wideHeading.x + wideHeading.width).toBeLessThan(wideEmail.x);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Return home" }),
  ).toBeVisible();
  await noSideScroll(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  const narrowHeading = (await heading().boundingBox())!;
  const narrowEmail = (await page.getByLabel("Email address").boundingBox())!;
  expect(narrowHeading.y + narrowHeading.height).toBeLessThan(narrowEmail.y);
  await noSideScroll(page);
});

test("the sign-in dialog is a card on a wide screen and a bottom sheet with a handle on a phone", async ({
  page,
}) => {
  const open = async () => {
    await page.goto("/");
    await page
      .getByRole("link", { name: "Sign in", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
    await expect(dialog).toBeVisible();
    return dialog;
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  const card = await open();
  const cardBox = (await card.boundingBox())!;
  expect(cardBox.width).toBeLessThan(600);
  const results = await new AxeBuilder({ page })
    .include("dialog[open]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  const sheet = await open();
  const sheetBox = (await sheet.boundingBox())!;
  expect(Math.round(sheetBox.width)).toBe(390);
  // A sheet: it reaches the bottom of the screen, scrolling when taller.
  expect(sheetBox.y + sheetBox.height).toBeGreaterThanOrEqual(844 - 1);
  await noSideScroll(page);
});

test("the sign-in dialog does not animate when motion is reduced", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page
      .getByRole("link", { name: "Sign in", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate(
        (element) => getComputedStyle(element).animationName,
      ),
    ).toBe("none");
  }
});
