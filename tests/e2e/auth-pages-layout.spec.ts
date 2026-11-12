import { expect, test } from "@playwright/test";

const pages = [
  { path: "/register", heading: "Create your free account." },
  { path: "/forgot-password", heading: "Forgotten your password?" },
  { path: "/reset-password", heading: "Choose a new password." },
] as const;

for (const { path, heading } of pages) {
  test(`${path} uses the shared two-panel frame with the real brand mark`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    // The retired text "OV" mark is gone; the brand link carries the logo.
    await expect(page.getByText("OV", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /OurValleys/ }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();

    // Wide screens put the welcome beside the form, so the heading sits left
    // of the actions' column and the page does not scroll sideways.
    const layout = page.locator("section[aria-labelledby]").first();
    const box = await layout.boundingBox();
    expect(box?.width).toBeGreaterThan(900);

    for (const width of [820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBe(false);
    }
  });
}

test("registration shows its form with the verification note, or the closed notice, inside the panel", async ({
  page,
}) => {
  await page.goto("/register");
  const form = page.getByLabel("Your name");
  if (await form.count()) {
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create your free account" }),
    ).toBeVisible();
    await expect(page.getByRole("note")).toContainText("verification link");
  } else {
    // Registration is closed until email sending is configured.
    await expect(page.getByRole("note")).toContainText("does not require");
    await expect(
      page.getByRole("link", { name: "Sign in instead" }),
    ).toBeVisible();
  }
});

test("an expired reset link explains itself and offers a fresh one", async ({
  page,
}) => {
  await page.goto("/reset-password");
  await expect(page.getByRole("note")).toContainText("no longer valid");
  await page.getByRole("link", { name: "Request a new link" }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
});
