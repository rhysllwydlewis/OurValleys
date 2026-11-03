import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
test.skip(!databaseUrl, "database is not configured");

// Fictional lists on the seeded demo business; removed again afterwards.
const slug = "cwm-coil-heating";
const productsTitle = "Index journey shop";
const treatmentsTitle = "Index journey services";
const sectionIds: string[] = [];

test.beforeAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const rows = await sql<Array<{ id: string }>>`
      insert into business_category_section
        (business_id, section_type, title, content, status, sort_order)
      select id, v.type, v.title, v.content, 'active', v.sort
      from business,
        (values
          ('products', ${productsTitle}, ${sql.json({
            entries: [
              {
                id: "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b01",
                title: "Seeded loaf",
                description: "Baked every morning.",
                meta: "£3.50",
                category: "Bakery",
              },
              {
                id: "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b02",
                title: "Welsh cakes",
                description: "A dozen, still warm.",
                meta: "£4.00",
                category: "bakery",
                availability: "sold_out",
              },
              {
                id: "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b03",
                title: "Slate coaster",
                description: "Hand cut.",
                meta: "£6.00",
                category: "Gifts",
              },
            ],
          })}::jsonb, 91),
          ('treatments', ${treatmentsTitle}, ${sql.json({
            entries: [
              {
                id: "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b04",
                title: "Deep tissue massage",
                description: "Sixty minutes.",
                meta: "£45",
              },
            ],
          })}::jsonb, 92)
        ) as v(type, title, content, sort)
      where business.slug = ${slug}
      returning id`;
    sectionIds.push(...rows.map((row) => row.id));
  } finally {
    await sql.end();
  }
});

test.afterAll(async () => {
  if (sectionIds.length === 0) return;
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business_category_section where id in ${sql(sectionIds)}`;
  } finally {
    await sql.end();
  }
});

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

test("the website groups a list under its categories and links to the catalogue", async ({
  page,
}) => {
  await page.goto(`/b/${slug}`);
  const groups = page.getByTestId("category-group");
  await expect(groups.first()).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Bakery" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Gifts" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Browse the whole catalogue" })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/b/${slug}/catalogue`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Catalogue" }),
  ).toBeVisible();
});

test("search and filters narrow the catalogue and can be cleared", async ({
  page,
}) => {
  await page.goto(`/b/${slug}/catalogue`);
  await expect(page.getByTestId("catalogue-card")).toHaveCount(4);
  await expectAccessible(page);

  await page.getByLabel("Search the catalogue").fill("cafe massage");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByTestId("catalogue-empty")).toBeVisible();

  await page.getByRole("link", { name: "Clear filters" }).first().click();
  await expect(page.getByTestId("catalogue-card")).toHaveCount(4);

  await page.getByLabel("Category").selectOption({ label: "Bakery (2)" });
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByTestId("catalogue-card")).toHaveCount(2);
  await expect(page.getByTestId("catalogue-count")).toHaveText("2 of 4 items");

  await page.getByLabel("Hide sold-out items").check();
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByTestId("catalogue-card")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Seeded loaf" })).toBeVisible();
  await expect(page.getByText("Welsh cakes")).toHaveCount(0);
});

test("a card opens the item page; unknown values are ignored without errors", async ({
  page,
}) => {
  const response = await page.goto(
    `/b/${slug}/catalogue?type=nonsense&category=%00&q=${"x".repeat(300)}`,
  );
  expect(response?.status()).toBe(200);
  await page.goto(`/b/${slug}/catalogue?type=treatments`);
  await expect(page.getByTestId("catalogue-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Deep tissue massage" }).click();
  await expect(page).toHaveURL(/\/catalogue\/6b6b6b6b-/);
});

test("an unknown business, or one with no catalogue, shows no catalogue", async ({
  page,
}) => {
  for (const path of [
    "/b/no-such-business-here/catalogue",
    // Seeded business with no products, services or team lists.
    "/b/rhondda-home-tutoring/catalogue",
  ]) {
    await page.goto(path);
    await expect(page.getByTestId("catalogue-card")).toHaveCount(0);
    await expect(page.getByTestId("catalogue-filters")).toHaveCount(0);
  }
});

test("the catalogue works at phone width without sideways scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/b/${slug}/catalogue`);
  await expect(page.getByTestId("catalogue-card")).toHaveCount(4);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "test-results/catalogue-index-mobile.png" });
});
