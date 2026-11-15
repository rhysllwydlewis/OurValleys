import AxeBuilder from "@axe-core/playwright";
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
  test(`Near me narrows events to the nearest place at ${viewport.name}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport,
      geolocation: inTheValleys,
      permissions: ["geolocation"],
    });
    const page = await context.newPage();
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("/events");

    await page.getByRole("button", { name: "Near me" }).click();
    await expect(page).toHaveURL(/near=aberdare/);
    await expect(
      page.getByRole("status").filter({ hasText: /near/i }),
    ).toContainText("Aberdare");
    // The distance panel opens on the applied place and shows it.
    await expect(page.getByLabel("Near", { exact: true })).toHaveValue(
      "aberdare",
    );
    await expect(
      page.getByRole("link", { name: /Remove near Aberdare/ }),
    ).toBeVisible();
    // The position itself never leaves the browser.
    expect(requests.join("\n")).not.toContain("51.7132");
    expect(requests.join("\n")).not.toContain("-3.4451");

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await page.screenshot({
      path: `test-results/events-near-me-${viewport.name}.png`,
    });
    await context.close();
  });
}

test("Near me keeps what is typed, a quick range and resets paging", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inTheValleys,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/events?when=month&page=2");
  await page.getByLabel("Search events").fill("quiz");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page).toHaveURL(/near=aberdare/);
  const url = new URL(page.url());
  expect(url.searchParams.get("q")).toBe("quiz");
  expect(url.searchParams.get("when")).toBe("month");
  expect(url.searchParams.has("page")).toBe(false);
  await context.close();
});

test("a place and distance in the link filter events and explain an empty result", async ({
  page,
}) => {
  await page.goto("/events?near=tonypandy&radius=3");
  await expect(page.getByText(/Near Tonypandy/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Remove near/ })).toBeVisible();
  // The feed link carries the same distance.
  await expect(page.locator('a[href*="feed.ics"]').first()).toHaveAttribute(
    "href",
    /near=tonypandy/,
  );

  await page.goto("/events?near=aberdare&radius=3&q=no-such-event-anywhere");
  await expect(page.getByText(/within 3km of Aberdare/).first()).toBeVisible();
});

test("removing the near chip restores the unfiltered events", async ({
  page,
}) => {
  await page.goto("/events?near=tonypandy&radius=3");
  await page.getByRole("link", { name: /Remove near/ }).click();
  await expect(page).toHaveURL(/\/events$/);
});

test("a stale or hostile place in the link degrades to the plain list", async ({
  page,
}) => {
  await page.goto("/events?near=not-a-real-place&radius=banana");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  // The filter is ignored, so no chip may claim a distance.
  await expect(page.getByRole("link", { name: /Remove near/ })).toHaveCount(0);
});

test("Near me explains when the visitor is outside the valleys and changes nothing", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inEdinburgh,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/events");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page.getByRole("status")).toContainText("outside the valleys");
  await expect(page).not.toHaveURL(/near=/);
  await context.close();
});

test("a refused location permission is explained and the Distance panel still works", async ({
  browser,
}) => {
  const context = await browser.newContext({ permissions: [] });
  const page = await context.newPage();
  await page.goto("/events");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page.getByRole("status")).toContainText(
    /Location is turned off|could not find your location/,
  );
  await page.locator("summary", { hasText: "Distance" }).click();
  await expect(page.getByLabel("Near", { exact: true })).toBeVisible();
  await context.close();
});

test("Near me works by keyboard and in Welsh", async ({ browser }) => {
  const context = await browser.newContext({
    geolocation: inTheValleys,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/events?lang=cy");
  const button = page.getByRole("button", { name: "Yn agos ataf" });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/near=aberdare/);
  await context.close();
});

test("the events search form with the distance panel has no axe violations", async ({
  page,
}) => {
  await page.goto("/events?near=tonypandy&radius=15");
  const results = await new AxeBuilder({ page })
    .include("form[action='/events']")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
