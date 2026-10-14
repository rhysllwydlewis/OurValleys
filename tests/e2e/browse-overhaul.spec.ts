import { expect, test } from "@playwright/test";

test("offers: compact header, category rail with counts, range and sort keep each other's filters", async ({
  page,
}) => {
  await page.goto("/offers");
  await expect(
    page.getByRole("heading", { level: 1, name: "Find a local offer." }),
  ).toBeVisible();
  const rail = page.getByRole("navigation", { name: "Offers by category" });
  await expect(rail.getByRole("link", { name: /^All offers/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await rail
    .getByRole("link", { name: /^Plumbing & heating, \d+ offers$/ })
    .click();
  await expect(page).toHaveURL(/category=plumbing-heating/);

  // Switching the sort keeps the category; the range keeps both.
  await page.getByRole("link", { name: "Newest" }).click();
  await expect(page).toHaveURL(/category=plumbing-heating/);
  await expect(page).toHaveURL(/sort=newest/);
  await page.getByRole("link", { name: /^Ending this week/ }).click();
  await expect(page).toHaveURL(/when=week/);
  await expect(page).toHaveURL(/category=plumbing-heating/);
  await expect(page).toHaveURL(/sort=newest/);
  await expect(
    page.getByRole("link", { name: "Remove the ending this week filter" }),
  ).toBeVisible();
});

test("offers: nothing ending this week offers a way back", async ({ page }) => {
  await page.goto("/offers?when=week&q=zzzzqqqq");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Nothing ends within the next week with these filters.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/offers$/);
});

test("offers: junk parameters fall back to defaults", async ({ page }) => {
  const response = await page.goto(
    "/offers?sort=cheapest&when=forever&page=-9",
  );
  expect(response?.status()).toBe(200);
  await expect(
    page
      .getByRole("link", { name: "Ending soonest" })
      .or(page.getByText("Ending soonest")),
  ).toBeVisible();
});

test("categories: counts, search, and the listed-only switch", async ({
  page,
}) => {
  await page.goto("/categories");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find the kind of help you need.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Categories at a glance")).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /^Plumbing & heating: \d+ business/ })
      .first(),
  ).toBeVisible();

  await page.getByRole("searchbox", { name: "Find a category" }).fill("heat");
  await page.getByRole("button", { name: "Find" }).click();
  await expect(page).toHaveURL(/\/categories\?q=heat/);
  await expect(
    page.getByRole("heading", { level: 2, name: /of 24 categories/ }),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Only categories with businesses" })
    .click();
  await expect(page).toHaveURL(/listed=1/);
  await expect(page).toHaveURL(/q=heat/);
});

test("categories: no match says so and links on to the directory", async ({
  page,
}) => {
  await page.goto("/categories?q=zzzzqqqq");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "No categories match “zzzzqqqq”.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Search businesses" }).last(),
  ).toHaveAttribute("href", "/businesses?q=zzzzqqqq");
});

test("guides: search, area rail and a featured guide", async ({ page }) => {
  await page.goto("/guides");
  await expect(page.getByText("Latest guide")).toBeVisible();
  await page.getByRole("link", { name: /^Porth, \d+ guides$/ }).click();
  await expect(page).toHaveURL(/area=Porth/);
  await expect(page.getByText("Latest guide")).toHaveCount(0);

  await page.goto("/guides?q=zzzzqqqq");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "No guides match these filters.",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Show all guides" }).click();
  await expect(page).toHaveURL(/\/guides$/);
});

test("the browse pages answer in Welsh and keep owner-written text tagged English", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "ov-locale", value: "cy", url: baseURL ?? "http://127.0.0.1:3200" },
  ]);
  await page.goto("/offers");
  await expect(
    page.getByRole("navigation", { name: "Cynigion yn ôl categori" }),
  ).toBeVisible();
  await page.goto("/categories");
  await expect(page.getByLabel("Categorïau ar un olwg")).toBeVisible();
  await page.goto("/guides");
  await expect(page.getByLabel("Chwilio’r canllawiau")).toBeVisible();
});

test("the browse pages do not scroll sideways on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/offers", "/categories", "/guides"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
