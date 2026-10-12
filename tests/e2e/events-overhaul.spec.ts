import { expect, test } from "@playwright/test";

const eventId = "00000000-0000-4000-8000-000000001201";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`the events agenda groups by day and fits at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/events");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find your next local event.",
      }),
    ).toBeVisible();
    // The search is on screen straight away, not pushed below a large hero.
    await expect(page.getByLabel("Search events")).toBeInViewport();

    const group = page.getByRole("region", {
      name: /Saturday,? 14 February 2099/,
    });
    await expect(group).toBeVisible();
    const row = group.locator("article").filter({
      hasText: "Fictional home-heating question session",
    });
    await expect(row.getByText("18:00")).toBeVisible();
    await expect(
      row.getByRole("link", {
        name: "Fictional home-heating question session",
        exact: true,
      }),
    ).toHaveAttribute("href", `/events/${eventId}`);
    await expect(
      row.getByRole("link", { name: /^Add .* to your calendar$/ }),
    ).toHaveAttribute("href", `/api/events/${eventId}/ics`);

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("picking a day narrows the agenda and can be undone", async ({ page }) => {
  await page.goto("/events?day=2099-02-14");
  await expect(
    page.getByRole("link", {
      name: "Fictional home-heating question session",
      exact: true,
    }),
  ).toBeVisible();
  const chip = page.getByRole("link", {
    name: /^Remove day filter Saturday,? 14 February 2099$/,
  });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page).toHaveURL(/\/events$/);
});

test("a day with nothing offers a way forward", async ({ page }) => {
  await page.goto("/events?day=2099-02-15");
  await expect(
    page.getByRole("heading", { name: /Nothing is listed for/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Next 30 days" }).click();
  await expect(page).toHaveURL(/when=month/);
  await expect(page.getByText("No upcoming events match")).toBeVisible();
});

test("an invalid day is ignored rather than breaking the page", async ({
  page,
}) => {
  const response = await page.goto("/events?day=2026-02-31&when=banana");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("link", {
      name: "Fictional home-heating question session",
      exact: true,
    }),
  ).toBeVisible();
});

test("the calendar feed link keeps the search but not a picked day", async ({
  page,
}) => {
  await page.goto("/events?q=heating&day=2099-02-14");
  await expect(
    page.getByRole("link", { name: "Subscribe in your calendar app" }),
  ).toHaveAttribute("href", "/api/events/feed.ics?q=heating");
});

test("the agenda is available in Welsh", async ({ page, baseURL }) => {
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL ?? "" }]);
  await page.goto("/events");
  await expect(
    page.getByRole("link", { name: /^Ychwanegu .* at eich calendr$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "30 diwrnod nesaf" }),
  ).toBeVisible();
});
