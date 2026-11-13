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

test("the password can be shown and hidden, and Caps Lock is pointed out", async ({
  page,
}) => {
  await page.goto("/login");
  const password = page.getByLabel("Password");
  await password.fill("a-secret-phrase");
  await expect(password).toHaveAttribute("type", "password");

  const show = page.getByRole("button", { name: "Show characters" });
  await expect(show).toHaveAttribute("aria-pressed", "false");
  await show.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("a-secret-phrase");
  const hide = page.getByRole("button", { name: "Hide characters" });
  await expect(hide).toHaveAttribute("aria-pressed", "true");
  await hide.click();
  await expect(password).toHaveAttribute("type", "password");

  // A headless browser has no real Caps Lock, so the key state is supplied.
  const typeWithCapsLock = (on: boolean) =>
    password.evaluate((element, modifierCapsLock) => {
      element.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "a",
          bubbles: true,
          modifierCapsLock,
        }),
      );
    }, on);
  await password.focus();
  await typeWithCapsLock(true);
  await expect(page.getByText("Caps Lock is on.")).toBeVisible();
  await typeWithCapsLock(false);
  await expect(page.getByText("Caps Lock is on.")).toHaveCount(0);
});

test("a shown password is hidden again when sign-in is attempted", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("nobody@example.test");
  await page.getByLabel("Password").fill("not-a-real-password");
  await page.getByRole("button", { name: "Show characters" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("email address or password is incorrect"),
  ).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
});

test("the demonstration chooser shows one account at a time and fills the one chosen", async ({
  page,
}) => {
  await page.goto("/login");
  const chooser = page.getByRole("group", { name: "Demonstration account" });
  test.skip(
    (await chooser.count()) === 0,
    "Only the viewer demonstration is offered at this release stage.",
  );

  await expect(chooser.getByRole("radio", { name: "Viewer" })).toBeChecked();
  await expect(
    page.getByRole("heading", {
      name: "View the fictional business dashboard",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Edit the fictional business as its owner",
    }),
  ).toHaveCount(0);

  // Keyboard: the arrow keys move between the accounts.
  await chooser.getByRole("radio", { name: "Viewer" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    chooser.getByRole("radio", { name: "Business owner" }),
  ).toBeChecked();
  await expect(
    page.getByRole("heading", {
      name: "Edit the fictional business as its owner",
    }),
  ).toBeVisible();
  // Choosing an account fills nothing until asked.
  await expect(page.getByLabel("Email address")).toHaveValue("");

  await page
    .getByRole("button", { name: "Fill business demo details" })
    .click();
  await expect(page.getByLabel("Email address")).toHaveValue(
    "demo.owner@ourvalleys.example",
  );
  await expect(
    page.getByText("Business owner demo details added", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Keep me signed in")).not.toBeChecked();
});

test("the sign-in page fits a laptop screen without scrolling past the form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  const signIn = page.getByRole("button", { name: "Sign in", exact: true });
  const box = (await signIn.boundingBox())!;
  expect(box.y + box.height).toBeLessThan(900);
  // The demonstration card is in view too, not three screens further down.
  const demo = (await page
    .getByRole("button", { name: "Fill demo details" })
    .boundingBox())!;
  expect(demo.y + demo.height).toBeLessThan(900);
});

test("the sign-in dialog offers password recovery and a new account", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sign in to OurValleys" });
  await expect(
    dialog.getByRole("link", { name: "Forgotten your password?" }),
  ).toHaveAttribute("href", /^\/forgot-password/);
  await expect(
    dialog.getByRole("link", { name: "Create a free account" }),
  ).toHaveAttribute("href", "/register");
  await dialog.getByRole("button", { name: "Continue browsing" }).click();
  await expect(dialog).not.toBeVisible();
});

test("the sign-in page is Welsh when Welsh is chosen", async ({
  page,
  baseURL,
}) => {
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Croeso’n ôl" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dangos y nodau" }),
  ).toBeVisible();
  await expect(page.getByText("signin.", { exact: false })).toHaveCount(0);
});
