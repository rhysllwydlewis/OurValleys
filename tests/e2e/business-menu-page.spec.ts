import { expect, test } from "@playwright/test";

test("the full menu page shows the menu, a way back and the allergen notice", async ({
  page,
}) => {
  await page.goto("/b/cwm-coil-heating/menu");
  await expect(
    page.getByRole("heading", { level: 1, name: "The menu" }),
  ).toBeVisible();
  await expect(
    page.getByText("Demonstration boiler-care visit").first(),
  ).toBeVisible();
  await expect(
    page.getByText("Dietary labels are supplied by the business"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Back to Cwm & Coil Heating" }),
  ).toHaveAttribute("href", "/b/cwm-coil-heating");
  await expect(
    page.getByRole("button", { name: "Print this menu" }),
  ).toBeVisible();
  // The fictional demo business never emits structured data or gets indexed.
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    0,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("the menu section links to the full menu page", async ({ page }) => {
  await page.goto("/b/cwm-coil-heating");
  await expect(
    page.getByRole("link", { name: "View the full menu" }),
  ).toHaveAttribute("href", "/b/cwm-coil-heating/menu");
});

test("a business without a published menu has no menu page", async ({
  page,
}) => {
  await page.goto("/b/not-a-real-business/menu");
  await expect(
    page.getByRole("heading", {
      name: "This published business page does not exist.",
    }),
  ).toBeVisible();
});

test("the full menu page is Welsh when the reader chooses Welsh", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto("/b/cwm-coil-heating/menu");
  await expect(
    page.getByRole("heading", { level: 1, name: "Y fwydlen" }),
  ).toBeVisible();
  await expect(
    page.getByText("Mae’r busnes yn darparu’r labeli dietegol"),
  ).toBeVisible();
});
