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

    test("choosing a valley heading in the list focuses that valley", async ({
      page,
    }) => {
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      await page
        .getByRole("region", { name: "Rhondda Fawr" })
        .getByRole("link", { name: "Rhondda Fawr" })
        .click();
      await expect(page).toHaveURL(/valley=rhondda-fawr/);
      await expect(page.getByTestId("valley-card")).toBeVisible();
      await expect(
        page
          .getByRole("navigation", { name: "Focus the map on a valley" })
          .getByRole("link", { name: /^Rhondda Fawr/ }),
      ).toHaveAttribute("aria-current", "true");
    });

    test("places clipped out of a focused valley are not in the tab order", async ({
      page,
    }) => {
      await page.goto("/map?valley=rhondda-fawr");
      await page.waitForLoadState("networkidle");
      const clipped = await page.evaluate(() => {
        const svg = document.querySelector("svg[data-focused]");
        if (!svg) return -1;
        const [x, y, w, h] = svg
          .getAttribute("viewBox")!
          .split(" ")
          .map(Number);
        let bad = 0;
        for (const el of svg.querySelectorAll("g[data-slug]")) {
          const c = el.querySelector("circle");
          const cx = Number(c?.getAttribute("cx"));
          const cy = Number(c?.getAttribute("cy"));
          const outside = cx < x! || cx > x! + w! || cy < y! || cy > y! + h!;
          if (outside && el.getAttribute("tabindex") === "0") bad += 1;
        }
        return bad;
      });
      expect(clipped).toBe(0);
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
        page
          .getByTestId("valley-card")
          .getByText(/^Lleoedd: \d+ · Busnesau: \d+$/),
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

  test.describe("the map itself", () => {
    const viewBox = (page: import("@playwright/test").Page) =>
      page.evaluate(() =>
        document
          .querySelector(
            'svg[aria-label="Map of places in the South Wales Valleys"]',
          )!
          .getAttribute("viewBox")!
          .split(" ")
          .map(Number),
      );

    test("draws real geography from files on this site only", async ({
      page,
    }) => {
      const hosts = new Set<string>();
      page.on("request", (request) => hosts.add(new URL(request.url()).host));
      const relief = page.waitForResponse((response) =>
        response.url().endsWith("/map/valleys-relief.webp"),
      );
      await page.goto("/map");
      expect((await relief).status()).toBe(200);
      await page.waitForLoadState("networkidle");

      const map = page.getByRole("group", {
        name: "Map of places in the South Wales Valleys",
      });
      // One river for each valley, the hill shading, and the council areas.
      await expect(map.locator("g[data-valley]")).toHaveCount(18);
      await expect(map.locator("image")).toHaveCount(1);
      const loaded = await map
        .locator("image")
        .evaluate(
          (image: SVGImageElement) => image.getBoundingClientRect().width > 0,
        );
      expect(loaded).toBe(true);
      await expect(
        page.getByText(/Contains OS data © Crown copyright/),
      ).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Map key" }).getByRole("listitem"),
      ).toHaveCount(5);
      // No tiles and no map provider: everything came from this origin.
      expect([...hosts]).toEqual([new URL(page.url()).host]);
    });

    test("puts places where they really are", async ({ page }) => {
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      const at = async (slug: string) =>
        page.evaluate((key) => {
          const circle = document.querySelector(
            `g[data-slug="${key}"] circle`,
          )!;
          return {
            x: Number(circle.getAttribute("cx")),
            y: Number(circle.getAttribute("cy")),
          };
        }, slug);
      const merthyr = await at("merthyr-tydfil-town");
      const pontypridd = await at("pontypridd");
      const neath = await at("neath");
      const pontypool = await at("pontypool");
      // Merthyr is north of Pontypridd; Neath is far west, Pontypool far east.
      expect(merthyr.y).toBeLessThan(pontypridd.y - 100);
      expect(neath.x).toBeLessThan(pontypridd.x - 300);
      expect(pontypool.x).toBeGreaterThan(pontypridd.x + 200);
    });

    test("zooms with the buttons and returns to the whole map", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      const zoomIn = page.getByRole("button", { name: "Zoom in" });
      const zoomOut = page.getByRole("button", { name: "Zoom out" });
      const reset = page.getByRole("button", { name: "Show the whole map" });
      await expect(zoomOut).toBeDisabled();
      await expect(reset).toBeDisabled();
      const [, , fullWidth] = await viewBox(page);
      expect(fullWidth).toBe(1000);

      await zoomIn.focus();
      await page.keyboard.press("Enter");
      const [, , zoomedWidth] = await viewBox(page);
      expect(zoomedWidth).toBeLessThan(fullWidth! * 0.7);
      await expect(zoomOut).toBeEnabled();

      // The closest zoom is a limit, not a trap.
      for (let press = 0; press < 6; press += 1) {
        if (await zoomIn.isDisabled()) break;
        await zoomIn.click();
      }
      await expect(zoomIn).toBeDisabled();
      const [, , closest] = await viewBox(page);
      expect(closest).toBeGreaterThanOrEqual(166);

      await reset.click();
      expect(await viewBox(page)).toEqual([0, 0, 1000, 722.2]);
      await expect(zoomOut).toBeDisabled();
    });

    test("a zoomed map can be dragged, and a drag does not choose a place", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Zoom in" }).click();
      const before = await viewBox(page);
      const place = page.getByRole("button", { name: /^Tonypandy: / });
      await place.scrollIntoViewIfNeeded();
      const box = (await place.boundingBox())!;
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 60, startY - 30, { steps: 6 });
      await page.mouse.up();
      const after = await viewBox(page);
      expect(after[0]).toBeGreaterThan(before[0]!);
      expect(after[1]).toBeGreaterThan(before[1]!);
      expect(after[2]).toBe(before[2]);
      await expect(place).toHaveAttribute("aria-pressed", "false");

      // A plain click afterwards still chooses it.
      await place.click();
      await expect(place).toHaveAttribute("aria-pressed", "true");
    });

    test("choosing a valley frames it and marks its river", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/map");
      await page.waitForLoadState("networkidle");
      await page
        .getByRole("navigation", { name: "Focus the map on a valley" })
        .getByRole("link", { name: /^Rhondda Fawr/ })
        .click();
      const [x, y, width, height] = await viewBox(page);
      expect(width).toBeLessThan(600);
      await expect(
        page.locator('g[data-valley="rhondda-fawr"]'),
      ).toHaveAttribute("data-active", "");
      // Every place in the valley is inside the framed view.
      const outside = await page.evaluate(
        ([vx, vy, vw, vh]) =>
          [...document.querySelectorAll("g[data-slug]:not([data-dim])")].filter(
            (element) => {
              const circle = element.querySelector("circle")!;
              const cx = Number(circle.getAttribute("cx"));
              const cy = Number(circle.getAttribute("cy"));
              return cx < vx! || cx > vx! + vw! || cy < vy! || cy > vy! + vh!;
            },
          ).length,
        [x, y, width, height],
      );
      expect(outside).toBe(0);
    });

    for (const viewport of [
      { name: "desktop", width: 1440, height: 900 },
      { name: "mobile", width: 390, height: 844 },
    ]) {
      test(`hydrates without errors on ${viewport.name}`, async ({ page }) => {
        const problems: string[] = [];
        page.on("console", (message) => {
          if (message.type() === "error") problems.push(message.text());
        });
        page.on("pageerror", (error) => problems.push(error.message));
        await page.setViewportSize(viewport);
        await page.goto("/map?valley=rhondda-fawr&place=tonypandy");
        await page.waitForLoadState("networkidle");
        await expect(
          page.getByRole("button", { name: /^Tonypandy: / }),
        ).toHaveAttribute("aria-pressed", "true");
        expect(problems).toEqual([]);
      });
    }

    test("a phone gets a taller map and a place linked to directly is on screen", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/map?place=neath");
      await page.waitForLoadState("networkidle");
      const map = page.getByRole("group", {
        name: "Map of places in the South Wales Valleys",
      });
      const size = (await map.boundingBox())!;
      expect(size.height).toBeGreaterThan(size.width);
      const neath = page.getByRole("button", { name: /^Neath: / });
      await expect(neath).toHaveAttribute("aria-pressed", "true");
      const box = (await neath.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(size.x);
      expect(box.x + box.width).toBeLessThanOrEqual(size.x + size.width);
      // The rest of the map is a sideways drag away, with no page overflow.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});
