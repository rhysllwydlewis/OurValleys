import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`business discovery is responsive at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/businesses");

    await expect(
      page.getByRole("heading", { name: "Find something useful nearby." }),
    ).toBeVisible();
    await expect(page.getByText("Cwm & Coil Heating")).toBeVisible();
    await expect(page.getByText("Fictional demo")).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test(`generated business website is responsive at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/b/cwm-coil-heating");

    await expect(
      page.getByText("Fictional demonstration business."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cwm & Coil Heating" }),
    ).toBeVisible();
    await expect(page.getByText("Boiler care visits")).toBeVisible();
    await expect(page.getByText("Serving Tonypandy")).toBeVisible();
    await expect(page.getByText("Not independently verified")).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("directory keyboard order reaches search with visible focus", async ({
  page,
}) => {
  await page.goto("/businesses");

  const homeLink = page
    .getByRole("banner")
    .getByRole("link", { name: "OurValleys home", exact: true });
  const query = page.getByLabel("What do you need?");

  await page.keyboard.press("Tab");
  await expect(homeLink).toBeFocused();

  for (let step = 0; step < 6; step += 1) {
    const queryIsFocused = await query.evaluate(
      (element) => element === document.activeElement,
    );
    if (queryIsFocused) break;
    await page.keyboard.press("Tab");
  }

  await expect(query).toBeFocused();
  const focusStyle = await query.evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  );
  expect(focusStyle).not.toBe("none");
});

test("directory has a useful zero-results state", async ({ page }) => {
  await page.goto("/businesses?q=no-such-service");
  await expect(
    page.getByRole("heading", { name: "No businesses match these filters." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear search" })).toBeVisible();
});

test("unpublished or unknown businesses render a private not-found state", async ({
  page,
}) => {
  await page.goto("/b/not-a-published-business");
  await expect(
    page.getByRole("heading", {
      name: "This published business page does not exist.",
    }),
  ).toBeVisible();

  const robotsDirectives = await page
    .locator('meta[name="robots"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content") ?? ""),
    );

  expect(robotsDirectives.length).toBeGreaterThan(0);
  expect(
    robotsDirectives.every((directive) => directive.includes("noindex")),
  ).toBe(true);
});
