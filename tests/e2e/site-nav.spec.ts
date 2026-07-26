import { expect, test } from "@playwright/test";

const PRIMARY_LINKS = [
  "Explore",
  "Businesses",
  "News",
  "Events",
  "Guides",
  "For business",
];

test.describe("primary navigation is consistent across the site", () => {
  test("the homepage nav has the same primary links as the site header", async ({
    page,
  }) => {
    await page.goto("/");
    const homeNav = page.getByRole("navigation", {
      name: "Primary navigation",
    });
    for (const label of PRIMARY_LINKS) {
      await expect(homeNav.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("the news page shows the same primary nav items as the homepage", async ({
    page,
  }) => {
    await page.goto("/news");
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    for (const label of PRIMARY_LINKS) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("homepage-section links resolve home-relative from another route", async ({
    page,
  }) => {
    await page.goto("/news");
    const nav = page.getByRole("navigation", { name: "Primary navigation" });

    await expect(nav.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/#discover",
    );
    await expect(
      nav.getByRole("link", { name: "For business" }),
    ).toHaveAttribute("href", "/#for-business");

    await nav.getByRole("link", { name: "Explore" }).click();
    await expect(page).toHaveURL(/\/#discover$/);
  });

  test("real routes are shared verbatim between the homepage and site header", async ({
    page,
  }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary navigation" });

    await expect(nav.getByRole("link", { name: "Businesses" })).toHaveAttribute(
      "href",
      "/businesses",
    );
    await expect(nav.getByRole("link", { name: "Events" })).toHaveAttribute(
      "href",
      "/events",
    );
    await expect(nav.getByRole("link", { name: "Guides" })).toHaveAttribute(
      "href",
      "/guides",
    );
  });
});
