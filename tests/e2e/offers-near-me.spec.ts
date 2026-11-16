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
  test(`Near me narrows offers to the nearest place at ${viewport.name}`, async ({
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
    await page.goto("/offers");

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
      path: `test-results/offers-near-me-${viewport.name}.png`,
    });
    await context.close();
  });
}

test("Near me keeps what is typed, the range and the sort, and resets paging", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inTheValleys,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/offers?when=week&sort=newest&page=2");
  await page.getByLabel("Search offers").fill("coffee");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page).toHaveURL(/near=aberdare/);
  const url = new URL(page.url());
  expect(url.searchParams.get("q")).toBe("coffee");
  expect(url.searchParams.get("when")).toBe("week");
  expect(url.searchParams.get("sort")).toBe("newest");
  expect(url.searchParams.has("page")).toBe(false);
  await context.close();
});

test("a place and distance in the link filter offers and explain an empty result", async ({
  page,
}) => {
  await page.goto("/offers?near=tonypandy&radius=3");
  await expect(
    page.getByRole("link", { name: /Free fictional heating check/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Remove near/ })).toBeVisible();
  // Sorting and the category rail keep the distance.
  await expect(
    page.getByRole("link", { name: "Newest", exact: true }),
  ).toHaveAttribute("href", /near=tonypandy&radius=3/);
  // One press leads to everything else near the same place.
  await expect(
    page.getByRole("link", { name: "Everything near Tonypandy" }),
  ).toHaveAttribute("href", "/nearby?near=tonypandy&radius=3");

  await page.goto("/offers?near=aberdare&radius=3");
  await expect(
    page.getByText("No offers are running within 3km of Aberdare."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Free fictional heating check/ }),
  ).toHaveCount(0);
});

test("the distance panel submits with the form and the chip removes it", async ({
  page,
}) => {
  await page.goto("/offers?sort=newest");
  await page.locator("summary", { hasText: "Distance" }).click();
  await page.getByLabel("Near", { exact: true }).selectOption("tonypandy");
  await page.getByLabel("Within", { exact: true }).selectOption("15");
  await page.getByRole("button", { name: "Filter offers" }).click();
  await expect(page).toHaveURL(/near=tonypandy/);
  const url = new URL(page.url());
  expect(url.searchParams.get("radius")).toBe("15");
  expect(url.searchParams.get("sort")).toBe("newest");

  await page.getByRole("link", { name: /Remove near/ }).click();
  await expect(page).not.toHaveURL(/near=/);
  expect(new URL(page.url()).searchParams.has("radius")).toBe(false);
  expect(new URL(page.url()).searchParams.get("sort")).toBe("newest");
});

test("a stale or hostile place in the link degrades to the plain list", async ({
  page,
}) => {
  await page.goto("/offers?near=not-a-real-place&radius=banana");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  // The filter is ignored, so no chip may claim a distance.
  await expect(page.getByRole("link", { name: /Remove near/ })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Free fictional heating check/ }),
  ).toBeVisible();
});

test("Near me explains when the visitor is outside the valleys and changes nothing", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inEdinburgh,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/offers");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page.getByRole("status")).toContainText("outside the valleys");
  await expect(page).not.toHaveURL(/near=/);
  await context.close();
});

test("Near me on offers works by keyboard and in Welsh", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inTheValleys,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/offers?lang=cy");
  const button = page.getByRole("button", { name: "Yn agos ataf" });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/near=aberdare/);

  await page.goto("/offers?near=aberdare&lang=cy");
  await expect(
    page.getByRole("link", { name: /Dileu’r hidlydd ger Aberdâr/ }),
  ).toBeVisible();
  await context.close();
});

test("the offers search form with the distance panel has no axe violations", async ({
  page,
}) => {
  await page.goto("/offers?near=tonypandy&radius=15");
  const results = await new AxeBuilder({ page })
    .include("form[action='/offers']")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
