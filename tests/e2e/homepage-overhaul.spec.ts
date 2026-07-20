import { expect, test } from "@playwright/test";

test("homepage presents one connected local discovery story", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Local life should feel joined up." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Find a local service/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What could be on nearby" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explore by area" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "All events, guides and additional business previews above are clearly fictional demonstration content.",
    ),
  ).toBeVisible();
});

test("profile-to-website story remains navigable", async ({ page }) => {
  await page.goto("/");

  const businessStory = page.locator("#for-business");
  await expect(
    businessStory.getByText("Maintain one profile", { exact: true }),
  ).toBeVisible();
  await expect(
    businessStory.getByText("Appear across local discovery", { exact: true }),
  ).toBeVisible();
  await expect(
    businessStory.getByText("Publish a polished website", { exact: true }),
  ).toBeVisible();
  await expect(
    businessStory.getByRole("link", { name: "Open the full demo" }),
  ).toHaveAttribute("href", "/b/cwm-coil-heating");
});
