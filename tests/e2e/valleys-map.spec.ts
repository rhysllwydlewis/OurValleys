import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const tonypandy = { latitude: 51.622, longitude: -3.455 };

test.describe("valleys map", () => {
  test("shows places, and a keyboard user can choose one and browse it", async ({
    page,
  }) => {
    await page.goto("/map");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "The valleys, place by place.",
      }),
    ).toBeVisible();

    const place = page.getByRole("button", {
      name: /^Tonypandy: \d+ local business/,
    });
    await place.focus();
    await expect(place).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(place).toHaveAttribute("aria-pressed", "true");

    const panel = page.getByRole("complementary", { name: "About this place" });
    await expect(
      panel.getByRole("heading", { name: "Tonypandy" }),
    ).toBeVisible();
    await expect(panel.getByText(/^\d+ local business(es)?$/)).toBeVisible();

    await panel.getByRole("link", { name: "Browse businesses here" }).click();
    await expect(page).toHaveURL(/\/businesses\?place=tonypandy/);
    await expect(page.getByText("Cwm & Coil Heating").first()).toBeVisible();
  });

  test("an empty place says so and offers a way to help", async ({ page }) => {
    await page.goto("/map");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: /^Pontypridd: no listed businesses/ })
      .click();
    const panel = page.getByRole("complementary", { name: "About this place" });
    await expect(panel.getByText("No listed businesses yet")).toBeVisible();
    await expect(
      panel.getByRole("link", { name: "Suggest a business" }),
    ).toBeVisible();
  });

  test("a place can be deep-linked and a category filter keeps it consistent", async ({
    page,
  }) => {
    await page.goto("/map?place=tonypandy");
    await expect(
      page.getByRole("button", { name: /^Tonypandy/ }),
    ).toHaveAttribute("aria-pressed", "true");

    await page
      .getByRole("link", { name: /^Plumbing & heating \(\d+\)$/ })
      .click();
    await expect(page).toHaveURL(/\/map\?category=/);
    await expect(
      page
        .getByRole("navigation", { name: "Filter the map by category" })
        .getByRole("link", { name: /^Plumbing & heating/ }),
    ).toHaveAttribute("aria-current", "true");
    await expect(
      page.getByRole("link", { name: "Everything" }),
    ).not.toHaveAttribute("aria-current", "true");
  });

  test("an unknown category or place in the URL is ignored safely", async ({
    page,
  }) => {
    const response = await page.goto("/map?category=%27%3B--&place=nowhere");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("link", { name: "Everything" }),
    ).toHaveAttribute("aria-current", "true");
    await expect(
      page.getByText("Choose a place on the map to see what is there."),
    ).toBeVisible();
  });

  test("the list below the map carries the same information", async ({
    page,
  }) => {
    await page.goto("/map");
    await page.waitForLoadState("networkidle");
    const row = page.getByRole("row", { name: /Tonypandy/ });
    await expect(row.getByRole("cell")).toHaveText(/^[1-9]\d*$/);
    await page
      .getByText(/^Places with no listed businesses yet \(\d+\)$/)
      .and(page.locator("summary"))
      .click();
    await expect(page.getByRole("link", { name: "Pontypridd" })).toBeVisible();
  });

  test.describe("valley regions", () => {
    test("a valley can be picked, shows its summary and resets", async ({
      page,
    }) => {
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      const picker = page.getByRole("navigation", {
        name: "Focus the map on a valley",
      });
      await expect(
        picker.getByRole("link", { name: "All valleys" }),
      ).toHaveAttribute("aria-current", "true");

      await picker
        .getByRole("link", { name: /^Rhondda Fawr \(\d+\)$/ })
        .click();
      await expect(page).toHaveURL(/valley=rhondda-fawr/);
      const card = page.getByTestId("valley-card");
      await expect(
        card.getByRole("heading", { name: "Rhondda Fawr" }),
      ).toBeVisible();
      await expect(
        card.getByText(/^Places: \d+ · Businesses: \d+$/),
      ).toBeVisible();
      await expect(
        card.getByRole("button", { name: "Tonypandy" }),
      ).toBeVisible();
      await expect(
        card.getByRole("link", { name: "Browse businesses in Rhondda Fawr" }),
      ).toHaveAttribute("href", "/businesses?place=rhondda-fawr");
      await expect(
        picker.getByRole("link", { name: /^Rhondda Fawr/ }),
      ).toHaveAttribute("aria-current", "true");

      await card.getByRole("button", { name: "Tonypandy" }).click();
      await expect(
        page.getByRole("button", { name: /^Tonypandy: / }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(/place=tonypandy/);

      await card.getByRole("button", { name: "Show every valley" }).click();
      await expect(card).toHaveCount(0);
      await expect(page).not.toHaveURL(/valley=/);
      await expect(
        picker.getByRole("link", { name: "All valleys" }),
      ).toHaveAttribute("aria-current", "true");
    });

    test("the valley is shared in the URL and a chosen place names its valley", async ({
      page,
    }) => {
      await page.goto("/map?valley=rhondda-fawr&place=tonypandy");
      await expect(page.getByTestId("valley-card")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "In Rhondda Fawr", exact: true }),
      ).toBeVisible();
      await page.goto("/map?valley=nowhere");
      await expect(page.getByTestId("valley-card")).toHaveCount(0);
    });

    test("a valley is reachable by keyboard and keeps the category filter", async ({
      page,
    }) => {
      await page.goto("/map?category=plumbing-heating");
      await page.waitForLoadState("networkidle");
      const chip = page
        .getByRole("navigation", { name: "Focus the map on a valley" })
        .getByRole("link", { name: /^Rhondda Fawr/ });
      await chip.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("valley-card")).toBeVisible();
      await expect(page).toHaveURL(/valley=rhondda-fawr/);
      await expect(page).toHaveURL(/category=plumbing-heating/);
    });

    test("the list is grouped under valley headings", async ({ page }) => {
      await page.goto("/map");
      const group = page.getByRole("region", { name: "Rhondda Fawr" });
      await expect(group.getByRole("row", { name: /Tonypandy/ })).toBeVisible();
      await expect(
        group.getByRole("heading", { name: "Rhondda Fawr" }).getByRole("link"),
      ).toHaveAttribute("href", /\/map\?valley=rhondda-fawr/);
    });

    test("Welsh readers get Welsh picker and panel text", async ({
      context,
      page,
      baseURL,
    }) => {
      await context.addCookies([
        {
          name: "ov-locale",
          value: "cy",
          url: baseURL ?? "http://127.0.0.1:3200",
        },
      ]);
      await page.goto("/map?valley=rhondda-fawr");
      await expect(
        page.getByRole("navigation", { name: "Canolbwyntio’r map ar gwm" }),
      ).toBeVisible();
      await expect(
        page.getByText(/^Lleoedd: \d+ · Busnesau: \d+$/),
      ).toBeVisible();
    });

    for (const [label, size] of [
      ["mobile", { width: 390, height: 844 }],
      ["tablet", { width: 820, height: 1100 }],
    ] as const) {
      test(`stays inside the screen on ${label} with a valley focused`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        await page.goto("/map?valley=rhondda-fawr");
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
        await expect(page.getByTestId("valley-card")).toBeVisible();
      });
    }

    test("on a phone the valley picker starts folded and folds again after a choice", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      const summary = page.getByText(/^Valleys/).and(page.locator("summary"));
      const picker = page.getByRole("navigation", {
        name: "Focus the map on a valley",
      });
      await expect(picker).toBeHidden();
      await summary.click();
      await expect(picker).toBeVisible();
      await picker.getByRole("link", { name: /^Rhondda Fawr/ }).click();
      await expect(picker).toBeHidden();
      await expect(summary).toContainText("Rhondda Fawr");
      await expect(page.getByTestId("valley-card")).toBeVisible();
    });

    test("has no accessibility violations with a valley focused", async ({
      page,
    }) => {
      await page.goto("/map?valley=rhondda-fawr");
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  });

  test.describe("with location allowed", () => {
    test.use({ geolocation: tonypandy, permissions: ["geolocation"] });

    test("finds the nearest places without sending the position anywhere", async ({
      page,
    }) => {
      const requests: string[] = [];
      page.on("request", (request) => {
        requests.push(request.url() + (request.postData() ?? ""));
      });
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Use my location" }).click();

      await expect(
        page.getByText("Closest to you", { exact: true }),
      ).toBeVisible();
      const nearest = page.getByRole("list").filter({ hasText: "km away" });
      await expect(nearest.getByRole("listitem").first()).toContainText(
        "Tonypandy",
      );
      await expect(nearest.getByRole("listitem")).toHaveCount(3);
      await expect(page.getByText(/outside the Valleys/)).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /^Tonypandy: / }),
      ).toHaveAttribute("aria-pressed", "true");

      const leaked = requests.filter(
        (entry) => entry.includes("51.622") || entry.includes("-3.455"),
      );
      expect(leaked).toEqual([]);
    });
  });

  test.describe("far from the valleys", () => {
    test.use({
      geolocation: { latitude: 55.9533, longitude: -3.1883 },
      permissions: ["geolocation"],
    });

    test("says the visitor is outside the area but still shows the nearest places", async ({
      page,
    }) => {
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Use my location" }).click();
      await expect(page.getByText(/outside the Valleys/)).toBeVisible();
      await expect(
        page.getByText("Closest to you", { exact: true }),
      ).toBeVisible();
    });
  });

  test("a refused location request explains what to do next", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (_ok: unknown, fail: (error: unknown) => void) =>
            fail({ code: 1, message: "denied" }),
        },
      });
    });
    await page.goto("/map");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByText(/could not get your location/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Use my location" }),
    ).toBeEnabled();
  });

  test.describe("Welsh browser", () => {
    test.use({ locale: "cy-GB" });

    test("renders the map in Welsh", async ({ page }) => {
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { level: 1, name: "Y cymoedd, fesul lle." }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /^Tonypandy: \d+ busnes lleol/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Defnyddio fy lleoliad" }),
      ).toBeVisible();
    });
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "tablet", width: 820, height: 1100 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    test(`fits the ${viewport.name} viewport with tappable places`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/map?place=tonypandy");
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const box = await page
        .getByRole("button", { name: /^Tonypandy/ })
        .boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(24);
      expect(box!.height).toBeGreaterThanOrEqual(24);
    });
  }

  test("has no axe violations with a place selected and nearest places shown", async ({
    page,
  }) => {
    await page.goto("/map?place=tonypandy");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  test("an empty, unlabelled place is still a usable touch target on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/map");
    await page.waitForLoadState("networkidle");
    const box = await page
      .getByRole("button", { name: /^Pontypridd: no listed businesses/ })
      .boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(18);
    expect(box!.height).toBeGreaterThanOrEqual(18);
  });

  test("a real category with no published businesses stays selected instead of falling back to everything", async ({
    page,
  }) => {
    await page.goto("/map?category=beauty-wellbeing");
    await expect(
      page
        .getByRole("navigation", { name: "Filter the map by category" })
        .getByRole("link", { name: /^Everything$/ }),
    ).not.toHaveAttribute("aria-current", "true");
    await expect(
      page
        .getByRole("navigation", { name: "Filter the map by category" })
        .getByRole("link", { name: /^Beauty/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the map controls are not exposed and the list still works", async ({
      page,
    }) => {
      await page.goto("/map");
      await expect(page.getByRole("button", { name: /Tonypandy/ })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("row", { name: /Tonypandy/ }).getByRole("link"),
      ).toBeVisible();
    });
  });
});
