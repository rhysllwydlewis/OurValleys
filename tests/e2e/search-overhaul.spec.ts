import { expect, test } from "@playwright/test";

test.describe("site search", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("the start page offers real categories, towns and quick routes", async ({
    page,
  }) => {
    await page.goto("/search");
    await expect(
      page.getByText("Search, or start from somewhere familiar."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Plumbing & heating/ }),
    ).toHaveAttribute("href", /\/businesses\?category=plumbing-heating/);
    await expect(page.getByRole("link", { name: "Tonypandy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open now" })).toBeVisible();
    // Nothing remembered yet, so no empty "recent searches" heading.
    await expect(page.getByText("Your recent searches")).toHaveCount(0);
  });

  test("results group by type with counts and each tab shows one type", async ({
    page,
  }) => {
    await page.goto("/search?q=heating");
    const tabs = page.getByRole("navigation", { name: "Types of result" });
    await expect(
      tabs.getByRole("link", { name: /Everything/ }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("heading", { name: /^Businesses \(/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Offers \(/ }),
    ).toBeVisible();

    await tabs.getByRole("link", { name: /Offers/ }).click();
    await expect(page).toHaveURL(/type=offers/);
    await expect(
      page.getByRole("heading", { name: /^Offers \(/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Businesses \(/ }),
    ).toHaveCount(0);
    await expect(tabs.getByRole("link", { name: /Offers/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await page.getByRole("link", { name: "Back to everything" }).click();
    await expect(page).toHaveURL(/\/search\?q=heating$/);
  });

  test("an exact business name is offered as the best match", async ({
    page,
  }) => {
    await page.goto("/search?q=Cwm%20%26%20Coil%20Heating");
    const best = page.getByRole("region", { name: /Best match/ });
    await expect(best).toBeVisible();
    await expect(
      best.getByRole("link", { name: "View the business website" }),
    ).toHaveAttribute("href", "/b/cwm-coil-heating");
  });

  test("a place search shows the place and how many businesses it holds", async ({
    page,
  }) => {
    await page.goto("/search?q=tonypandy");
    await expect(
      page.getByRole("link", { name: "Explore Tonypandy" }),
    ).toHaveAttribute("href", "/places/tonypandy");
    await expect(page.getByText(/business(es)? listed/).first()).toBeVisible();
  });

  test("nothing found leads to categories and a way to suggest a business", async ({
    page,
  }) => {
    await page.goto("/search?q=zzzzqqqq");
    await expect(
      page.getByRole("heading", { name: /Nothing matched/ }),
    ).toBeVisible();
    await expect(page.getByText("Browse by category")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Suggest a business" }).last(),
    ).toHaveAttribute("href", "/suggest-a-business");
  });

  test("punctuation alone is not a search", async ({ page }) => {
    await page.goto("/search?q=%25%25");
    await expect(
      page.getByText("Search, or start from somewhere familiar."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Nothing matched/ }),
    ).toHaveCount(0);
  });

  test("a page past the end starts the tab over", async ({ page }) => {
    await page.goto("/search?q=heating&type=businesses&page=99");
    await expect(page).toHaveURL(/\/search\?q=heating&type=businesses$/);
    await expect(
      page.getByRole("heading", { name: /^Businesses \(/ }),
    ).toBeVisible();
  });

  test("unknown types fall back to everything", async ({ page }) => {
    await page.goto("/search?q=heating&type=%3Cscript%3E");
    await expect(
      page.getByRole("heading", { name: /^Businesses \(/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^Offers \(/ }),
    ).toBeVisible();
  });

  test("the box suggests as you type and works from the keyboard", async ({
    page,
  }) => {
    await page.goto("/search");
    await page.waitForLoadState("networkidle");
    const input = page.getByRole("combobox", {
      name: "What are you looking for?",
    });
    await input.fill("cwm coil");
    const listbox = page.getByRole("listbox", { name: "Search suggestions" });
    await expect(
      listbox.getByRole("option", { name: /Cwm & Coil Heating/ }),
    ).toBeVisible();
    await input.press("Escape");
    await expect(listbox).toBeHidden();
  });

  test("recent searches are remembered in this browser and can be cleared", async ({
    page,
  }) => {
    await page.goto("/search?q=heating");
    await expect(
      page.getByRole("heading", { name: /^Businesses \(/ }),
    ).toBeVisible();
    // The browser remembers the search once the page is interactive.
    await page.waitForFunction(() =>
      window.localStorage.getItem("ov-recent-searches")?.includes("heating"),
    );
    await page.goto("/search");
    await expect(page.getByText("Your recent searches")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "heating", exact: true }),
    ).toHaveAttribute("href", "/search?q=heating");

    await page.getByRole("button", { name: "Clear recent searches" }).click();
    const status = page
      .getByRole("main")
      .getByRole("status")
      .filter({ hasText: "Recent searches cleared." });
    await expect(status).toBeVisible();
    // Focus moves to the confirmation instead of falling to the page body.
    await expect(status).toBeFocused();
    await page.reload();
    await expect(page.getByText("Your recent searches")).toHaveCount(0);
  });

  test("a failed search is not remembered", async ({ page }) => {
    await page.goto("/search?q=zzzzqqqq");
    await expect(
      page.getByRole("heading", { name: /Nothing matched/ }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem("ov-recent-searches"),
      ),
    ).toBeNull();
    await page.goto("/search");
    await expect(page.getByText("Your recent searches")).toHaveCount(0);
  });

  test("an empty tab says so and leads back", async ({ page }) => {
    await page.goto("/search?q=heating&type=guides");
    await expect(
      page.getByText("Nothing in this tab matched “heating”."),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to everything" }),
    ).toBeVisible();
  });

  test("a short query does not get a best-match guess", async ({ page }) => {
    await page.goto("/search?q=cw");
    await expect(page.getByRole("region", { name: /Best match/ })).toHaveCount(
      0,
    );
  });

  for (const width of [390, 820, 1440]) {
    test(`results do not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [
        "/search",
        "/search?q=heating",
        "/search?q=zzzzqqqq",
      ]) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe("site search in Welsh", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page
      .context()
      .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("tabs, best match and start panel are Welsh", async ({ page }) => {
    await page.goto("/search?q=Cwm%20%26%20Coil%20Heating");
    await expect(
      page.getByRole("navigation", { name: "Mathau o ganlyniad" }),
    ).toBeVisible();
    await expect(page.getByText(/Y cyfatebiad gorau/)).toBeVisible();
    await page.goto("/search");
    await expect(page.getByText("Categorïau poblogaidd")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ar agor nawr" }),
    ).toBeVisible();
  });

  test("an empty result offers Welsh recovery", async ({ page }) => {
    await page.goto("/search?q=zzzzqqqq");
    await expect(page.getByText("Pori yn ôl categori")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Awgrymu busnes" }).last(),
    ).toBeVisible();
  });
});
