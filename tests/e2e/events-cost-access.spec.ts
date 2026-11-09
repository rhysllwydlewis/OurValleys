import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
const fixtureEventId = "00000000-0000-4000-8000-000000001201";
const fixtureTitle = "Fictional home-heating question session";
const day = "/events?day=2099-02-14";

test.skip(!databaseUrl, "database is not configured");
test.describe.configure({ mode: "serial" });

async function setCost(values: {
  isFree: boolean | null;
  stepFree: boolean | null;
  priceNote: string | null;
}) {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`
      update business_event
      set is_free = ${values.isFree}, step_free = ${values.stepFree}, price_note = ${values.priceNote}
      where id = ${fixtureEventId}
    `;
  } finally {
    await sql.end();
  }
}

test.afterAll(async () => {
  await setCost({ isFree: null, stepFree: null, priceNote: null });
});

test("an event with no stated cost or access shows no cost tags and is not matched by the filters", async ({
  page,
}) => {
  await setCost({ isFree: null, stepFree: null, priceNote: null });
  await page.goto(day);
  await expect(
    page.getByRole("link", { name: fixtureTitle, exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-event-cost]")).toHaveCount(0);

  await page.goto(`${day}&free=1`);
  await expect(
    page.getByRole("link", { name: fixtureTitle, exact: true }),
  ).toHaveCount(0);
  await page.goto(`${day}&stepFree=1`);
  await expect(
    page.getByRole("link", { name: fixtureTitle, exact: true }),
  ).toHaveCount(0);
});

test("free and step-free events are tagged, filterable and removable", async ({
  page,
}) => {
  await setCost({ isFree: true, stepFree: true, priceNote: null });
  await page.goto(day);
  const row = page.locator("article", { hasText: fixtureTitle });
  await expect(row.locator('[data-event-cost="free"]')).toHaveText("Free");
  await expect(row.locator('[data-event-cost="stepFree"]')).toHaveText(
    "Step-free access",
  );

  // Turning the chips on narrows to stated events; the filter is a plain link.
  await page
    .getByRole("link", { name: "Free events only", exact: true })
    .click();
  await expect(page).toHaveURL(/free=1/);
  await expect(
    page.getByRole("link", { name: fixtureTitle, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Step-free events only", exact: true })
    .click();
  await expect(page).toHaveURL(/stepFree=1/);
  await expect(
    page.getByRole("link", { name: fixtureTitle, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Remove the free events filter" }),
  ).toBeVisible();

  // The detail page repeats the tags.
  await page
    .getByRole("link", { name: fixtureTitle, exact: true })
    .first()
    .click();
  await expect(page.locator('[data-event-cost="free"]')).toBeVisible();

  await page.goto(`${day}&free=1`);
  await page
    .getByRole("link", { name: "Remove the free events filter" })
    .click();
  await expect(page).not.toHaveURL(/free=1/);
});

test("a paid event shows its note and a Welsh reader sees Welsh labels", async ({
  page,
  context,
}) => {
  await setCost({ isFree: false, stepFree: false, priceNote: "£4 adults" });
  await page.goto(day);
  const row = page.locator("article", { hasText: fixtureTitle });
  await expect(row.locator('[data-event-cost="paid"]')).toHaveText("£4 adults");
  await expect(row.locator('[data-event-cost="notStepFree"]')).toHaveText(
    "Not step-free",
  );
  await page.goto(`${day}&free=1`);
  await expect(
    page.getByRole("link", { name: fixtureTitle, exact: true }),
  ).toHaveCount(0);

  await context.addCookies([
    { name: "ov-locale", value: "cy", url: page.url() },
  ]);
  await setCost({ isFree: true, stepFree: true, priceNote: null });
  await page.goto(day);
  await expect(page.locator('[data-event-cost="free"]').first()).toHaveText(
    "Am ddim",
  );
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 820, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`the cost filters and tags are accessible and do not overflow at ${viewport.name}`, async ({
    page,
  }) => {
    await setCost({ isFree: true, stepFree: true, priceNote: null });
    await page.setViewportSize(viewport);
    await page.goto(`${day}&free=1&stepFree=1`);
    await expect(
      page.getByRole("link", { name: fixtureTitle, exact: true }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });
}
