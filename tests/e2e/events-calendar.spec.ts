import { expect, test } from "@playwright/test";

const month = "/events?view=month&month=2099-02";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`the month calendar shows the fixture day and fits at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(month);

    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "February 2099",
        exact: true,
      }),
    ).toBeVisible();
    const grid = page.getByRole("table");
    await expect(
      grid.getByRole("columnheader", { name: "Monday" }),
    ).toBeVisible();
    await expect(
      grid.getByRole("link", {
        name: /Saturday,? 14 February 2099: \d+ events?/,
      }),
    ).toBeVisible();
    // The events themselves are listed below the grid.
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

test("choosing a day narrows the list and the month can be restored", async ({
  page,
}) => {
  await page.goto(month);
  await page
    .getByRole("table")
    .getByRole("link", { name: /Saturday,? 14 February 2099/ })
    .click();
  await expect(page).toHaveURL(/day=2099-02-14/);
  await expect(
    page.getByRole("heading", {
      name: /Events on Saturday,? 14 February 2099/,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Show the whole month" }).click();
  await expect(page).not.toHaveURL(/day=/);
  await expect(page).toHaveURL(/view=month/);
});

test("month navigation moves between months and keeps filters", async ({
  page,
}) => {
  await page.goto(`${month}&q=heating`);
  await page.getByRole("link", { name: "Next month" }).click();
  await expect(page).toHaveURL(/month=2099-03/);
  await expect(page).toHaveURL(/q=heating/);
  await expect(
    page.getByRole("heading", { level: 2, name: "March 2099", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Nothing is listed for March 2099."),
  ).toBeVisible();
});

test("the view switch moves between list and month", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("link", { name: "Month", exact: true }).click();
  await expect(page).toHaveURL(/view=month/);
  await page.getByRole("link", { name: "List", exact: true }).click();
  await expect(page).not.toHaveURL(/view=month/);
});

test("a bad month in the URL falls back to the current month", async ({
  page,
}) => {
  const response = await page.goto("/events?view=month&month=2026-13");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("table")).toBeVisible();
});

test.describe("in Welsh", () => {
  test.use({ locale: "cy-GB" });

  test("the calendar is readable and keyboard operable", async ({ page }) => {
    await page.goto(month);
    await expect(
      page.getByRole("link", { name: "Mis", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Y mis nesaf" })).toBeVisible();
    const link = page
      .getByRole("table")
      .getByRole("link", { name: /14/ })
      .first();
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/day=2099-02-14/);
  });
});
