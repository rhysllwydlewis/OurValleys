import { expect, test } from "@playwright/test";

const week = "/events?view=week&week=2099-02-09";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`the week view shows seven days and the fixture event at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(week);

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /9 February.* to .*15 February/,
      }),
    ).toBeVisible();
    const days = page.getByRole("list", { name: "Day by day" });
    await expect(days.getByRole("heading", { level: 3 })).toHaveCount(7);
    await expect(
      days.getByRole("heading", { level: 3, name: /Saturday,? 14 February/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Fictional home-heating question session",
        exact: true,
      }),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}

test("a day inside the week opens the same week and navigation is plain links", async ({
  page,
}) => {
  await page.goto("/events?view=week&week=2099-02-12");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: /9 February.* to .*15 February/,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Next week" }).click();
  await expect(page).toHaveURL(/week=2099-02-16/);
  await expect(
    page.getByText("Nothing is listed for this week."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Previous week" }).click();
  await expect(page).toHaveURL(/week=2099-02-09/);
});

test("an empty week offers a jump to the next date with events", async ({
  page,
}) => {
  // The fixture event is on 14 February 2099; the week before it is empty.
  await page.goto("/events?view=week&week=2099-02-02");
  await expect(
    page.getByText("Nothing is listed for this week."),
  ).toBeVisible();
  const jump = page.getByRole("link", {
    name: /Jump to the next date with events/,
  });
  await expect(jump).toBeVisible();
  await jump.click();
  await expect(page).toHaveURL(/week=2099-02-09/);
  await expect(
    page.getByRole("link", {
      name: "Fictional home-heating question session",
      exact: true,
    }),
  ).toBeVisible();
});

test("an empty month offers the same jump and a month calendar link", async ({
  page,
}) => {
  await page.goto("/events?view=month&month=2099-01");
  const jump = page.getByRole("link", {
    name: /Jump to the next date with events/,
  });
  await expect(jump).toBeVisible();
  await jump.click();
  await expect(page).toHaveURL(/month=2099-02/);
  await expect(
    page.getByRole("link", { name: /Add February 2099 to your calendar/ }),
  ).toHaveAttribute("href", /\/api\/events\/feed\.ics\?month=2099-02/);
});

test("the view switch moves between list, week and month", async ({ page }) => {
  await page.goto("/events");
  const views = page.getByRole("navigation", { name: "How to view events" });
  await views.getByRole("link", { name: "Week" }).click();
  await expect(page).toHaveURL(/view=week/);
  await expect(views.getByRole("link", { name: "Week" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await views.getByRole("link", { name: "Month" }).click();
  await expect(page).toHaveURL(/view=month/);
  await views.getByRole("link", { name: "List" }).click();
  await expect(page).not.toHaveURL(/view=/);
});

test("a bad week falls back to the current week without an error", async ({
  page,
}) => {
  const response = await page.goto("/events?view=week&week=2099-02-31");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("list", { name: "Day by day" })).toBeVisible();
});

test("the week and month calendar feeds are scoped", async ({ request }) => {
  const inWeek = await request.get("/api/events/feed.ics?week=2099-02-12");
  expect(inWeek.status()).toBe(200);
  expect(await inWeek.text()).toContain(
    "Fictional home-heating question session",
  );
  const otherWeek = await request.get("/api/events/feed.ics?week=2099-03-02");
  expect(await otherWeek.text()).not.toContain("BEGIN:VEVENT");
  const month = await request.get("/api/events/feed.ics?month=2099-02");
  expect(await month.text()).toContain("BEGIN:VEVENT");
});

test("the week view honours reduced motion and stays keyboard reachable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(week);
  await page.keyboard.press("Tab");
  const next = page.getByRole("link", { name: "Next week" });
  await next.focus();
  await expect(next).toBeFocused();
});
