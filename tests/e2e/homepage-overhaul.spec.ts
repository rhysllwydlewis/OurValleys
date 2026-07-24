import { expect, test } from "@playwright/test";

test("homepage presents one connected local discovery story", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Local life should feel joined up." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Home & trades Local help for jobs at home/,
    }),
  ).toHaveAttribute("href", "/businesses?q=plumbing");
  await expect(
    page.getByRole("heading", { name: "Ideas for the days ahead" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Explore the Valleys by area." }),
  ).toBeVisible();
  await expect(
    page.getByText("Event previews use the public lifecycle projection.", {
      exact: false,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("link", {
      name: "View Fictional home-heating question session",
    }),
  ).toHaveAttribute("href", "/events/00000000-0000-4000-8000-000000001201");
  await expect(
    page.locator("#areas").getByRole("link", { name: /Aberdare.*Explore area/ }),
  ).toHaveAttribute("href", "/places/aberdare");
  await expect(
    page.getByRole("link", { name: /Independent coffee across the Valleys/ }),
  ).toHaveAttribute("href", "/guides/independent-coffee-across-the-valleys");
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
    businessStory.getByRole("link", { name: "View the full demonstration" }),
  ).toHaveAttribute("href", "/b/cwm-coil-heating");
});
