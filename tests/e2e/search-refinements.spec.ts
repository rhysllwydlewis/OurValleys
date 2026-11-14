import { expect, test } from "@playwright/test";

test.describe("search refinements", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("narrow by area without JavaScript-only controls, then remove the chip", async ({
    page,
  }) => {
    await page.goto("/search?q=heating");
    const region = page.getByRole("region", {
      name: "Narrow the search results",
    });
    await region.getByText("Narrow these results").click();
    await region.getByLabel("Place").selectOption("tonypandy");
    await region.getByRole("button", { name: "Apply" }).click();

    await expect(page).toHaveURL(/place=tonypandy/);
    const chips = page.getByRole("group", { name: "Active search filters" });
    await expect(
      chips.getByRole("link", { name: /Remove place filter Tonypandy/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Cwm & Coil Heating/ }).first(),
    ).toBeVisible();
    // Saving keeps only words and tab, so it is not offered while filtered.
    await expect(
      page.getByRole("button", { name: /Save this search/ }),
    ).toHaveCount(0);

    await chips
      .getByRole("link", { name: /Remove place filter Tonypandy/ })
      .click();
    await expect(page).not.toHaveURL(/place=/);
    await expect(
      page.getByRole("group", { name: "Active search filters" }),
    ).toHaveCount(0);
  });

  test("tabs and paging keep the filters", async ({ page }) => {
    await page.goto("/search?q=heating&place=tonypandy&openNow=1&sort=az");
    const tabs = page.getByRole("navigation", { name: "Types of result" });
    const offers = tabs.getByRole("link", { name: /Offers/ });
    if ((await offers.count()) > 0) {
      await expect(offers).toHaveAttribute(
        "href",
        /place=tonypandy.*openNow=1.*sort=az/,
      );
    }
    await expect(
      page.getByRole("link", { name: /Remove open now filter/ }).first(),
    ).toBeVisible();
  });

  test("filters that remove everything explain it and offer a way back", async ({
    page,
  }) => {
    await page.goto("/search?q=heating&place=no-such-place");
    await expect(
      page.getByRole("heading", {
        name: "Nothing matched with these filters.",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Remove all filters" }).click();
    await expect(page).toHaveURL(/\/search\?q=heating$/);
    await expect(
      page.getByRole("heading", { name: /^Businesses \(/ }),
    ).toBeVisible();
  });

  test("hostile filter values are ignored, not echoed or executed", async ({
    page,
  }) => {
    const response = await page.goto(
      "/search?q=heating&place=%27%3Bdrop%20table%20place%3B--&category=%3Cscript%3Ealert(1)%3C%2Fscript%3E&sort=price",
    );
    expect(response?.status()).toBe(200);
    await expect(page.locator("main script")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /^Businesses \(/ }),
    ).toBeVisible();
  });

  test("Welsh readers get Welsh labels", async ({ page, context, baseURL }) => {
    await context.addCookies([
      {
        name: "ov-locale",
        value: "cy",
        url: baseURL ?? "http://127.0.0.1:3200",
      },
    ]);
    await page.goto("/search?q=heating&place=tonypandy");
    await expect(page.getByText("Culhau’r canlyniadau")).toBeVisible();
  });

  test("works at phone width with no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/search?q=heating&place=tonypandy&openNow=1&sort=az");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
