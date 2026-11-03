import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
test.skip(!databaseUrl, "database is not configured");

// A fictional section on the seeded demo business; removed again afterwards.
const slug = "cwm-coil-heating";
const sectionTitle = "Catalogue page journey";
const productId = "5a5a5a5a-5a5a-4a5a-8a5a-5a5a5a5a5a01";
const soldOutId = "5a5a5a5a-5a5a-4a5a-8a5a-5a5a5a5a5a02";
let sectionId = "";

test.beforeAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const [row] = await sql<Array<{ id: string }>>`
      insert into business_category_section
        (business_id, section_type, title, content, status, sort_order)
      select id, 'products', ${sectionTitle},
        ${sql.json({
          entries: [
            {
              id: productId,
              title: "Hand-poured candle",
              description: "Soy wax, made in the valley.",
              meta: "£8.00 · 200g",
              availability: "limited",
              url: "https://shop.example.test/candle",
            },
            {
              id: soldOutId,
              title: "Seasonal wreath",
              description: "Gone for this year.",
              meta: "£25.00",
              availability: "sold_out",
              url: "https://shop.example.test/wreath",
            },
          ],
        })},
        'active', 90
      from business where slug = ${slug}
      returning id`;
    sectionId = row!.id;
  } finally {
    await sql.end();
  }
});

test.afterAll(async () => {
  if (!sectionId) return;
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business_category_section where id = ${sectionId}`;
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

test("a product card opens its own page with price, stock and an order link", async ({
  page,
}) => {
  await page.goto(`/b/${slug}`);
  await page
    .getByRole("link", { name: "Details for Hand-poured candle" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/catalogue/${productId}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Hand-poured candle" }),
  ).toBeVisible();
  await expect(page.getByText("£8.00")).toBeVisible();
  await expect(page.getByText("Limited stock")).toBeVisible();
  const order = page.getByRole("link", { name: /Order online/ });
  await expect(order).toHaveAttribute(
    "href",
    "https://shop.example.test/candle",
  );
  await expect(order).toHaveAttribute("rel", /noopener/);
  await expect(
    page.getByRole("link", { name: "Ask about this" }),
  ).toBeVisible();
  // Demonstration businesses are never indexed.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expectAccessible(page);

  await page.getByRole("link", { name: "Details for Seasonal wreath" }).click();
  await expect(page.getByText("Sold out").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Order online/ })).toHaveCount(0);
  await expectAccessible(page);

  await page.getByRole("link", { name: /Back to/ }).click();
  await expect(page).toHaveURL(new RegExp(`/b/${slug}#feature-`));
});

test("an unknown, malformed or other business's id shows the not-found page", async ({
  page,
}) => {
  const notFound = page.getByRole("heading", { level: 1 });
  for (const path of [
    `/b/${slug}/catalogue/5a5a5a5a-5a5a-4a5a-8a5a-5a5a5a5a5aff`,
    `/b/${slug}/catalogue/not-an-id`,
    // The id belongs to another business, so it must not resolve here.
    `/b/rhondda-home-tutoring/catalogue/${productId}`,
  ]) {
    await page.goto(path);
    await expect(notFound).not.toHaveText("Hand-poured candle");
    await expect(page.getByText("Hand-poured candle")).toHaveCount(0);
    await expect(page.getByTestId("catalogue-entry")).toHaveCount(0);
  }
});

test("the page reflows on a phone with no sideways scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/b/${slug}/catalogue/${productId}`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
