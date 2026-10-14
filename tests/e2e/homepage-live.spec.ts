import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`the homepage area tiles show live counts and fit at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const areas = page.locator("#areas");
    await expect(
      areas.getByRole("link", { name: /Tonypandy.*1 business/ }),
    ).toHaveAttribute("href", "/places/tonypandy");
    // The count is the directory's count: the one seeded business sits in
    // Tonypandy and no other tile claims one.
    await expect(areas.getByText("1 business", { exact: true })).toHaveCount(1);
    await expect(
      areas.getByRole("link", { name: "All places →" }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Recently added businesses" }),
    ).toBeVisible();
    await expect(
      page
        .locator("section[aria-labelledby='home-new-title']")
        .getByRole("link", { name: /Cwm & Coil Heating/ }),
    ).toHaveAttribute("href", "/b/cwm-coil-heating");

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("on a phone the area tiles are a swipeable rail and the page stays short", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const rail = page.locator("#areas a[href^='/places/']").first().locator("..");
  const overflow = await rail.evaluate((element) => ({
    scrollable: element.scrollWidth > element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
  }));
  expect(overflow).toEqual({ scrollable: true, overflowX: "auto" });

  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  expect(height).toBeLessThan(8000);
});

test("near you ranks places in the browser and never sends the position", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  // Standing in Tonypandy: it must come first, Pontypridd and Aberdare next.
  await context.setGeolocation({ latitude: 51.622, longitude: -3.455 });
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  const near = page.locator("[data-home-near]");
  await expect(near.getByRole("heading", { name: "Near you" })).toBeVisible();
  await near.getByRole("button", { name: "Use my location" }).click();

  const results = near.getByRole("list", { name: "Closest places to you" });
  const items = results.getByRole("link");
  await expect(items).toHaveCount(3);
  await expect(items.first()).toContainText("Tonypandy");
  await expect(items.first()).toHaveAttribute("href", "/places/tonypandy");
  await expect(items.first()).toContainText("0.0 km away");
  await expect(near.getByRole("button", { name: "Look again" })).toBeVisible();

  expect(
    requests.filter((url) => url.includes("51.62") || url.includes("-3.455")),
  ).toEqual([]);
});

test("near you explains a refusal without looking anything up", async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await page.goto("/");
  const near = page.locator("[data-home-near]");
  await near.getByRole("button", { name: "Use my location" }).click();
  await expect(near.getByRole("status")).toContainText(
    "Location was not shared",
  );
  await expect(near.getByRole("list")).toHaveCount(0);
});

test("near you says when the visitor is outside the Valleys", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 55.953, longitude: -3.188 });
  await page.goto("/");
  const near = page.locator("[data-home-near]");
  await near.getByRole("button", { name: "Use my location" }).click();
  await expect(near.getByRole("status")).toContainText("outside the Valleys");
  await expect(near.getByRole("link").first()).toBeVisible();
});

test("the whole homepage body is Welsh when Welsh is chosen", async ({
  page,
  baseURL,
}) => {
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  for (const heading of [
    "Beth sydd ei angen arnoch heddiw?",
    "Dylai bywyd lleol deimlo’n gysylltiedig.",
    "Archwiliwch y Cymoedd fesul ardal.",
    "Canllawiau lleol defnyddiol",
    "Busnesau a ychwanegwyd yn ddiweddar",
    "Gwefan i bob busnes lleol",
    "Porwch yn gyntaf. Mewngofnodwch pan fydd yn ddefnyddiol.",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(
    page.locator("#areas").getByRole("link", { name: /1 busnes/ }),
  ).toBeVisible();
  await expect(
    page.locator("[data-home-near]").getByRole("button", {
      name: "Defnyddio fy lleoliad",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Creu cyfrif" }),
  ).toBeVisible();
  // None of the old English-only section copy survives.
  await expect(page.getByText("Explore the Valleys by area.")).toHaveCount(0);
  await expect(page.getByText("Browse first.")).toHaveCount(0);
});

test("with reduced motion every new homepage section is present", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-home-root]")).toHaveAttribute(
    "data-motion",
    "reduced",
  );
  await expect(page.locator("[data-home-near]")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recently added businesses" }),
  ).toBeVisible();
});
