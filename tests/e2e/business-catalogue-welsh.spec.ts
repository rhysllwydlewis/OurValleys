import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
test.skip(!databaseUrl, "database is not configured");

// Two fictional lists on the seeded demo business, removed again afterwards:
// one fully translated, one with a row still missing its Welsh name.
const slug = "cwm-coil-heating";
const translatedId = "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b01";
const partialId = "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b03";
let sectionIds: string[] = [];

test.beforeAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const rows = await sql<Array<{ id: string }>>`
      insert into business_category_section
        (business_id, section_type, title, content, status, sort_order)
      select id, 'products', title, content::jsonb, 'active', sort_order
      from business,
        (values
          ('Welsh catalogue journey',
           ${JSON.stringify({
             entries: [
               {
                 id: translatedId,
                 title: "Hand-poured candle",
                 description: "Soy wax.",
                 titleCy: "Cannwyll wedi’i thywallt â llaw",
                 descriptionCy: "Cwyr soi.",
                 meta: "£8.00",
               },
             ],
           })}, 91),
          ('Half translated journey',
           ${JSON.stringify({
             entries: [
               {
                 id: partialId,
                 title: "Wool blanket",
                 description: "Warm.",
                 titleCy: "Blanced wlân",
                 descriptionCy: "Cynnes.",
               },
               {
                 id: "6b6b6b6b-6b6b-4b6b-8b6b-6b6b6b6b6b04",
                 title: "Slate coaster",
                 description: "Hard-wearing.",
               },
             ],
           })}, 92)
        ) as v(title, content, sort_order)
      where slug = ${slug}
      returning id`;
    sectionIds = rows.map((row) => row.id);
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

test("Welsh readers see translated entries on the website, index and entry page", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto(`/b/${slug}`);
  const card = page.getByRole("link", {
    name: "Cannwyll wedi’i thywallt â llaw",
    exact: true,
  });
  await expect(card).toBeVisible();
  // Translated words are not marked as English; the half-translated list is.
  await expect(card).not.toHaveAttribute("lang", "en-GB");
  const untranslated = page.getByRole("link", {
    name: "Wool blanket",
    exact: true,
  });
  await expect(untranslated).toBeVisible();
  await expect(page.getByText("Cwyr soi.")).toBeVisible();

  await card.click();
  await expect(page).toHaveURL(new RegExp(`/catalogue/${translatedId}$`));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Cannwyll wedi’i thywallt â llaw",
    }),
  ).toBeVisible();
  await expect(page.getByText("Cwyr soi.")).toBeVisible();
  await expect(page.getByText("Soy wax.")).toHaveCount(0);
  await expectAccessible(page);

  await page.goto(`/b/${slug}/catalogue?q=cannwyll`);
  await expect(page.getByTestId("catalogue-card")).toHaveCount(1);
  await expectAccessible(page);
});

test("English readers still see the English text", async ({ page }) => {
  await page.goto(`/b/${slug}/catalogue/${translatedId}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Hand-poured candle" }),
  ).toBeVisible();
  await expect(page.getByText("Cwyr soi.")).toHaveCount(0);
});
