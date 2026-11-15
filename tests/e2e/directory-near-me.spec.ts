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
  test(`Near me narrows the directory to the nearest place at ${viewport.name}`, async ({
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
    await page.goto("/businesses");

    const button = page.getByRole("button", { name: "Near me" });
    await expect(button).toBeVisible();
    await button.click();

    await expect(page).toHaveURL(/near=aberdare/);
    await expect(
      page.getByRole("status").filter({ hasText: /near/i }),
    ).toContainText("Aberdare");
    // The panel shows the place that was applied, not a stale "Any distance".
    await expect(page.getByLabel("Near", { exact: true })).toHaveValue(
      "aberdare",
    );
    // The position itself never leaves the browser.
    expect(requests.join("\n")).not.toContain("51.7132");
    expect(requests.join("\n")).not.toContain("-3.4451");

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await page.screenshot({
      path: `test-results/near-me-${viewport.name}.png`,
      fullPage: false,
    });
    await context.close();
  });
}

test("Near me keeps the visitor's other filters and resets paging", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inTheValleys,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/businesses?q=heating&sort=az&page=2");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page).toHaveURL(/near=aberdare/);
  const url = new URL(page.url());
  expect(url.searchParams.get("q")).toBe("heating");
  expect(url.searchParams.get("sort")).toBe("az");
  expect(url.searchParams.has("page")).toBe(false);
  await context.close();
});

test("Near me explains when the visitor is outside the valleys and changes nothing", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inEdinburgh,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/businesses");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page.getByRole("status")).toContainText("outside the valleys");
  await expect(page).not.toHaveURL(/near=/);
  await context.close();
});

test("Near me explains a refused location permission and keeps the select usable", async ({
  browser,
}) => {
  const context = await browser.newContext({ permissions: [] });
  const page = await context.newPage();
  await page.goto("/businesses");
  await page.getByRole("button", { name: "Near me" }).click();
  await expect(page.getByRole("status")).toContainText(
    /Location is turned off|could not find your location/,
  );
  await page.locator("summary", { hasText: "More filters" }).click();
  await expect(page.getByLabel("Near", { exact: true })).toBeVisible();
  await context.close();
});

test("Near me works by keyboard and is announced in Welsh", async ({
  browser,
}) => {
  const context = await browser.newContext({
    geolocation: inTheValleys,
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  await page.goto("/businesses?lang=cy");
  const button = page.getByRole("button", { name: "Yn agos ataf" });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/near=aberdare/);
  await context.close();
});

test("the directory with the Near me button has no axe violations", async ({
  page,
}) => {
  await page.goto("/businesses");
  await expect(page.getByRole("button", { name: "Near me" })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include("form[role=search]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
