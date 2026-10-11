import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`directory shows a compact search and rich cards at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/businesses?q=heating");

    // Search, category and place are always on screen; the rest is tucked away.
    await expect(page.getByLabel("What do you need?")).toBeVisible();
    await expect(page.getByLabel("Category")).toBeVisible();
    await expect(page.getByLabel("Place")).toBeVisible();
    await expect(page.getByLabel("Verified only")).toBeHidden();

    const card = page
      .locator(".business-card")
      .filter({ hasText: "Cwm & Coil Heating" });
    await expect(card).toBeVisible();
    await expect(
      card.getByRole("list", { name: "Services" }).getByRole("listitem"),
    ).not.toHaveCount(0);
    await expect(card.getByText("Offer", { exact: true })).toBeVisible();
    // Open or closed is always stated in words, never by colour alone.
    await expect(card.getByText(/^(Open now|Closed now)$/)).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("the whole card opens the business and the name is a real link", async ({
  page,
}) => {
  await page.goto("/businesses?q=heating");
  const link = page
    .locator(".business-card")
    .filter({ hasText: "Cwm & Coil Heating" })
    .getByRole("heading", { name: "Cwm & Coil Heating" })
    .getByRole("link");
  await expect(link).toHaveAttribute("href", "/b/cwm-coil-heating");
  await link.click();
  await expect(page).toHaveURL(/\/b\/cwm-coil-heating$/);
});

test("more filters opens by keyboard, shows its count and submits as a GET", async ({
  page,
}) => {
  await page.goto("/businesses");
  const summary = page.getByText("More filters", { exact: true });
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Open now")).toBeVisible();

  await page.getByLabel("Open now").check();
  await page.getByLabel("Delivery").check();
  await page.getByRole("button", { name: "Search businesses" }).click();

  await expect(page).toHaveURL(/openNow=1/);
  await expect(page).toHaveURL(/delivery=1/);
  // The panel reopens by itself when one of its filters is active.
  await expect(page.getByText("More filters (2)")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Delivery" })).toBeChecked();
  await expect(
    page.getByRole("link", { name: "Remove delivery filter" }),
  ).toBeVisible();
});

test("removing a chip keeps the other filters and the chosen sort", async ({
  page,
}) => {
  await page.goto("/businesses?q=zzzzqqqq&verified=1&delivery=1&sort=az");
  await page.getByRole("link", { name: "Remove delivery filter" }).click();
  await expect(page).toHaveURL(/\/businesses\?q=zzzzqqqq&verified=1&sort=az$/);
});

test("sort links keep every filter and mark the current order", async ({
  page,
}) => {
  await page.goto("/businesses?q=heating&sort=az");
  const sortNav = page.getByRole("navigation", { name: "Sort by" });
  await expect(sortNav.locator('[aria-current="true"]')).toHaveText("A to Z");
  await sortNav.getByRole("link", { name: "Newest first" }).click();
  await expect(page).toHaveURL(/\/businesses\?q=heating&sort=newest$/);
});

test("the map link follows the chosen category", async ({ page }) => {
  await page.goto("/businesses?category=plumbing-heating");
  const link = page.getByRole("link", {
    name: /^View .* on the map$/,
  });
  await expect(link).toHaveAttribute("href", "/map?category=plumbing-heating");
  await page.goto("/businesses");
  await expect(
    page.getByRole("link", { name: "View on the map" }),
  ).toHaveAttribute("href", "/map");
});

test("a page number past the end shows the first page, not an error", async ({
  page,
}) => {
  await page.goto("/businesses?q=heating&page=999");
  await expect(
    page.locator(".business-card").filter({ hasText: "Cwm & Coil Heating" }),
  ).toBeVisible();
});

test("the directory is translated for Welsh readers", async ({
  page,
  baseURL,
}) => {
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto("/businesses?q=heating");
  await expect(page.getByText("Rhagor o hidlwyr")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Gweld ar y map" }),
  ).toBeVisible();
  const card = page
    .locator(".business-card")
    .filter({ hasText: "Cwm & Coil Heating" });
  await expect(card.getByText("Cynnig", { exact: true })).toBeVisible();
  await expect(card.getByText(/^(Ar agor nawr|Ar gau nawr)$/)).toBeVisible();
});

test("reduced motion removes the card lift", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/businesses?q=heating");
  const card = page
    .locator(".business-card")
    .filter({ hasText: "Cwm & Coil Heating" });
  await card.hover();
  const transform = await card.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  expect(transform).toBe("none");
});
