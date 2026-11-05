import { expect, test } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
test.skip(!databaseUrl, "database is not configured");

// Fictional photos on the seeded demo business; removed again afterwards.
const slug = "cwm-coil-heating";
const keyPrefix = "e2e-photo-framing";

const picture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#3d6b5a"/></svg>';

test.beforeAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business_media where storage_key like ${`${keyPrefix}/%`}`;
    // [index, description, focal x, focal y, zoom]
    const rows = [
      ["1", "A zoomed workshop bench", 25, 75, 200],
      ["2", "An unzoomed tool wall", 50, 50, 100],
    ] as const;
    for (const [index, alt, x, y, zoom] of rows) {
      await sql`
        insert into business_media
          (business_id, role, storage_key, alt_text, content_type, byte_size,
           focal_x, focal_y, zoom_pct, sort_order, status)
        select id, 'gallery', ${`${keyPrefix}/${index}.svg`}, ${alt},
          'image/svg+xml', 1024, ${x}, ${y}, ${zoom}, ${3000 + Number(index)}, 'active'
        from business where slug = ${slug}`;
    }
  } finally {
    await sql.end();
  }
});

test.afterAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business_media where storage_key like ${`${keyPrefix}/%`}`;
  } finally {
    await sql.end();
  }
});

test.beforeEach(async ({ page }) => {
  await page.route(/\/e2e-photo-framing\//, (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: picture }),
  );
});

test("a zoomed photo is cropped in on its focal point; an unzoomed one is untouched", async ({
  page,
}) => {
  await page.goto(`/b/${slug}/gallery`);
  const zoomed = page
    .getByRole("link", { name: /A zoomed workshop bench/ })
    .locator("img");
  await expect(zoomed).toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)");
  await expect(zoomed).toHaveCSS("transform-origin", /^(?!0px 0px)/);
  const plain = page
    .getByRole("link", { name: /An unzoomed tool wall/ })
    .locator("img");
  await expect(plain).toHaveCSS("transform", "none");

  // The zoomed picture stays inside its tile: nothing spills onto the page.
  const tile = page
    .getByRole("link", { name: /A zoomed workshop bench/ })
    .first();
  await expect(tile).toHaveCSS("overflow", "hidden");
});

test("zoomed photos never cause horizontal scrolling on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/b/${slug}/gallery`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
