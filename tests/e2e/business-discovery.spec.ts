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
    await expect(
      page.getByText("Fictional demo", { exact: true }).first(),
    ).toBeVisible();

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
      page.getByRole("heading", {
        name: "Cwm & Coil Heating",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText("Boiler care visits")).toBeVisible();
    await expect(page.getByText("Serving Tonypandy")).toBeVisible();
    await expect(page.getByText("Not independently verified")).toBeVisible();
    await expect(page.getByText("Powered by OurValleys")).toBeVisible();

    const businessHeader = page.getByRole("banner");
    await expect(
      businessHeader.getByRole("link", { name: /Cwm & Coil Heating/ }),
    ).toBeVisible();
    await expect(
      businessHeader.getByRole("link", { name: "OurValleys home" }),
    ).toHaveCount(0);

    if (viewport.width <= 768) {
      await businessHeader.getByLabel("Open navigation menu").click();
    }

    const businessNavigation = businessHeader.getByRole("navigation", {
      name: "Business page sections",
    });
    await expect(
      businessNavigation.getByRole("link", { name: "About" }),
    ).toBeVisible();
    await expect(
      businessNavigation.getByRole("link", { name: "Services" }),
    ).toBeVisible();
    await expect(
      businessNavigation.getByRole("link", { name: "Gallery" }),
    ).toHaveCount(0);
    await expect(
      businessNavigation.getByRole("link", { name: "Location" }),
    ).toBeVisible();
    await expect(
      businessNavigation.getByRole("link", { name: "Hours" }),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("the generated business website supports keyboard bypass navigation", async ({
  page,
}) => {
  await page.goto("/b/cwm-coil-heating");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });

  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#business-skip-target")).toBeFocused();
});

test("directory keyboard order reaches search with visible focus", async ({
  page,
}) => {
  await page.goto("/businesses");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  const homeLink = page
    .getByRole("banner")
    .getByRole("link", { name: "OurValleys home", exact: true });
  const query = page.getByLabel("What do you need?");

  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(homeLink).toBeFocused();

  // The shared navigation can grow as real sections are delivered. Follow the
  // actual keyboard order rather than coupling this accessibility check to an
  // exact number of links between the brand and directory search.
  for (let step = 0; step < 20; step += 1) {
    if (await query.evaluate((element) => element === document.activeElement)) {
      break;
    }
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
  await expect(
    page.getByText("Browse a category with local businesses:"),
  ).toBeVisible();
  // Which category(ies) have a published business, and how many, depends on
  // whatever else has been created in this environment by the time this runs
  // (other suites publish their own fixture businesses) — only the mechanism
  // itself is asserted here, not a specific category name or count.
  await expect(
    page
      .locator('[aria-label="Categories with local businesses"]')
      .getByRole("link")
      .first(),
  ).toBeVisible();
});

test("directory zero-results state suggests a nearby place when the chosen place has no matches", async ({
  page,
}) => {
  await page.goto("/businesses?category=plumbing-heating&place=aberdare");
  await expect(
    page.getByRole("heading", { name: "No businesses match these filters." }),
  ).toBeVisible();
  await expect(page.getByText("Or search a nearby place:")).toBeVisible();

  const nearbyPlaceLink = page
    .getByRole("link", { name: "Cynon Valley" })
    .first();
  await expect(nearbyPlaceLink).toBeVisible();
  await nearbyPlaceLink.click();
  await expect(page).toHaveURL(
    /\/businesses\?category=plumbing-heating&place=cynon-valley/,
  );
});

test("zero-results suggestions do not carry forward open-now or verified-only filters", async ({
  page,
}) => {
  // The suggestion queries never checked open-now/verified-only, so keeping
  // those filters on the suggestion links guaranteed a second dead end.
  await page.goto("/businesses?openNow=1&verified=1");
  await expect(
    page.getByRole("heading", { name: "No businesses match these filters." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Suggestions below ignore your open now and verified only filters",
    ),
  ).toBeVisible();

  const suggestedCategoryLink = page
    .locator('[aria-label="Categories with local businesses"]')
    .getByRole("link")
    .first();
  await expect(suggestedCategoryLink).toBeVisible();
  const href = await suggestedCategoryLink.getAttribute("href");
  expect(href).not.toContain("openNow");
  expect(href).not.toContain("verified");

  await suggestedCategoryLink.click();
  await expect(
    page.getByRole("heading", { name: "No businesses match these filters." }),
  ).not.toBeVisible();
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
