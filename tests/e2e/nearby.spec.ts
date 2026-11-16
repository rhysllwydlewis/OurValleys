import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

// Standing in the middle of Aberdare, whose seeded centre is the nearest.
const inTheValleys = { latitude: 51.7132, longitude: -3.4451 };
const inEdinburgh = { latitude: 55.9533, longitude: -3.1883 };

for (const viewport of viewports) {
  test(`the nearby page gathers businesses, events and offers at ${viewport.name}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(String(error)));
    await page.goto("/nearby?near=tonypandy&radius=15");

    await expect(
      page.getByRole("heading", { level: 1, name: "Near Tonypandy" }),
    ).toBeVisible();
    // Each section shows the seeded fictional business, its event and its offer.
    await expect(
      page
        .locator("#nearby-businesses")
        .getByRole("link", { name: "Cwm & Coil Heating", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("#nearby-events").getByRole("link", {
        name: "Fictional home-heating question session",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page
        .locator("#nearby-offers")
        .getByRole("link", { name: /Free fictional heating check/ }),
    ).toBeVisible();
    // A business awaiting review in the same town is never shown.
    await expect(page.getByText("Rhondda Home Tutoring")).toHaveCount(0);

    // "See all" opens the full list with the same place and distance.
    await expect(
      page.getByRole("link", { name: /See all businesses/ }),
    ).toHaveAttribute("href", "/businesses?near=tonypandy&radius=15");
    await expect(
      page.getByRole("link", { name: /See all events/ }),
    ).toHaveAttribute("href", "/events?near=tonypandy&radius=15");
    await expect(
      page.getByRole("link", { name: /See all offers/ }),
    ).toHaveAttribute("href", "/offers?near=tonypandy&radius=15");

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    expect(problems).toEqual([]);
    await page.screenshot({
      path: `test-results/nearby-${viewport.name}.png`,
      fullPage: true,
    });
    await context.close();
  });
}

test("choosing a town and a distance submits an ordinary form", async ({
  page,
}) => {
  await page.goto("/nearby");
  await expect(
    page.getByRole("heading", { level: 1, name: "What is near you?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pick a town to begin" }),
  ).toBeVisible();

  await page.getByLabel("Near", { exact: true }).selectOption("tonypandy");
  await page.getByLabel("Within", { exact: true }).selectOption("3");
  await page.getByRole("button", { name: "Show what is near" }).click();
  await expect(page).toHaveURL(/\/nearby\?near=tonypandy&radius=3$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Near Tonypandy" }),
  ).toBeVisible();
});

test("the count on the nearby page matches the list it opens", async ({
  page,
}) => {
  await page.goto("/nearby?near=tonypandy&radius=15");
  const offers = await page.locator('[data-nearby-stat="offers"]').innerText();
  await page.getByRole("link", { name: /See all offers/ }).click();
  await expect(page).toHaveURL(/\/offers\?near=tonypandy&radius=15$/);
  await expect(
    page.getByRole("heading", {
      name: offers === "1" ? "1 current offer" : `${offers} current offers`,
    }),
  ).toBeVisible();
});

test("the distance switch widens from an empty result", async ({ page }) => {
  await page.goto("/nearby?near=aberdare&radius=3");
  await expect(
    page.getByRole("heading", {
      name: "Nothing is listed within 3km of Aberdare",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Look within 8km" }).click();
  await expect(page).toHaveURL(/\/nearby\?near=aberdare$/);

  await page
    .getByRole("navigation", { name: "Within" })
    .getByRole("link", { name: "30km" })
    .click();
  await expect(page).toHaveURL(/near=aberdare&radius=30/);
  await expect(
    page
      .locator("#nearby-businesses")
      .getByRole("link", { name: "Cwm & Coil Heating", exact: true }),
  ).toBeVisible();
});

test("a neighbouring town chip moves the page there and keeps the distance", async ({
  page,
}) => {
  await page.goto("/nearby?near=tonypandy&radius=3");
  await page.getByRole("link", { name: /What is near Penygraig/ }).click();
  await expect(page).toHaveURL(/\/nearby\?near=penygraig&radius=3$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Near Penygraig" }),
  ).toBeVisible();
  // The chooser follows the place now in force.
  await expect(page.getByLabel("Near", { exact: true })).toHaveValue(
    "penygraig",
  );
});

test("an unknown or hostile place is explained and offers a way on", async ({
  page,
}) => {
  await page.goto("/nearby?near=not-a-real-place&radius=banana");
  await expect(
    page.getByRole("heading", { name: "We do not know that place" }),
  ).toBeVisible();
  await expect(page.locator("[data-nearby-stat]")).toHaveCount(0);

  await page.goto("/nearby?near=%3Cscript%3Ealert(1)%3C/script%3E");
  await expect(
    page.getByRole("heading", { name: "Pick a town to begin" }),
  ).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
});

test("Near me picks the nearest town and never sends the position", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inTheValleys,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/nearby");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page).toHaveURL(/\/nearby\?near=aberdare/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Near Aberdare" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: /near/i }),
  ).toContainText("Aberdare");
  expect(requests.join("\n")).not.toContain("51.7132");
  expect(requests.join("\n")).not.toContain("-3.4451");
  await context.close();
});

test("Near me explains a visitor outside the valleys and a refused permission", async ({
  browser,
}) => {
  const outside = await browser.newContext({
    geolocation: inEdinburgh,
    permissions: ["geolocation"],
  });
  const far = await outside.newPage();
  await far.goto("/nearby");
  await far.getByRole("button", { name: "Near me" }).click();
  await expect(far.getByRole("status")).toContainText("outside the valleys");
  await expect(far).not.toHaveURL(/near=/);
  await outside.close();

  const refused = await browser.newContext({ permissions: [] });
  const page = await refused.newPage();
  await page.goto("/nearby");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page.getByRole("status")).toContainText(
    /Location is turned off|could not find your location/,
  );
  // The town list is still there to use instead.
  await expect(page.getByLabel("Near", { exact: true })).toBeVisible();
  await refused.close();
});

test("the nearby page works by keyboard and in Welsh", async ({ browser }) => {
  const context = await browser.newContext({
    geolocation: inTheValleys,
    permissions: ["geolocation"],
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/nearby?lang=cy");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Beth sydd yn agos atoch chi?",
    }),
  ).toBeVisible();
  const button = page.getByRole("button", { name: "Yn agos ataf" });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/nearby\?near=aberdare/);

  // Welsh readers get the Welsh place name and Welsh section headings.
  await page.goto("/nearby?near=aberdare&radius=30&lang=cy");
  await expect(
    page.getByRole("heading", { level: 1, name: "Ger Aberdâr" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Beth sydd ymlaen" }),
  ).toBeVisible();
  await context.close();
});

test("the homepage, footer and place pages lead to the nearby page", async ({
  page,
}) => {
  await page.goto("/places/tonypandy");
  await page.getByRole("link", { name: "Everything near Tonypandy" }).click();
  await expect(page).toHaveURL(/\/nearby\?near=tonypandy$/);

  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Nearby", exact: true })
    .click();
  await expect(page).toHaveURL(/\/nearby$/);

  await page.goto("/");
  await expect(
    page
      .getByRole("navigation", { name: /quick/i })
      .getByRole("link", { name: "Near me" }),
  ).toHaveAttribute("href", "/nearby");
});
