import { expect, test } from "@playwright/test";

test.describe("place mini-map", () => {
  test("a town page shows its valley, marks the town and links neighbours", async ({
    page,
  }) => {
    await page.goto("/places/treorchy");
    const section = page.getByRole("region", {
      name: "Treorchy in Rhondda Fawr",
    });
    await expect(section).toBeVisible();
    const map = section.getByRole("group", {
      name: "Map of places in Rhondda Fawr",
    });
    await expect(map).toBeVisible();
    await expect(map.getByRole("link", { name: /^Treorchy:/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(section.getByText("You are here")).toBeVisible();

    await map.getByRole("link", { name: /^Tonypandy:/ }).click();
    await expect(page).toHaveURL(/\/places\/tonypandy$/);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Tonypandy in Rhondda Fawr",
      }),
    ).toBeVisible();
  });

  test("a valley page shows the valley at a glance without a 'you are here' marker", async ({
    page,
  }) => {
    await page.goto("/places/rhondda-fawr");
    await expect(
      page.getByRole("heading", { level: 2, name: "Rhondda Fawr at a glance" }),
    ).toBeVisible();
    await expect(page.getByText("You are here")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Where the businesses are" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open the valley on the map" }),
    ).toHaveAttribute("href", "/map?valley=rhondda-fawr");
  });

  test("an unknown place shows no mini-map", async ({ page }) => {
    await page.goto("/places/not-a-real-place");
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("#place-minimap-title")).toHaveCount(0);
  });

  test("Welsh visitors get Welsh text and a Welsh valley name", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "ov-locale", value: "cy", url: "http://127.0.0.1:3000" },
    ]);
    await page.goto("/places/treorchy");
    await expect(page.getByText("Rydych chi yma")).toBeVisible();
  });
});
