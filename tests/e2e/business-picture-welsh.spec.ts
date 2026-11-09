import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
test.skip(!databaseUrl, "database is not configured");

// A fictional offer with a picture on the seeded demo business, removed again
// afterwards. The picture file is answered by a route stub, never fetched.
const slug = "cwm-coil-heating";
const keyPrefix = "e2e-picture-welsh";
const mediaWelsh = "00000000-0000-4000-8000-00000000e301";
const mediaEnglish = "00000000-0000-4000-8000-00000000e302";
const offerWelsh = "00000000-0000-4000-8000-00000000e311";
const offerEnglish = "00000000-0000-4000-8000-00000000e312";

const picture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#3d6b5a"/></svg>';

async function cleanUp(sql: postgres.Sql) {
  await sql`delete from business_offer where id in (${offerWelsh}, ${offerEnglish})`;
  await sql`delete from business_media where storage_key like ${`${keyPrefix}/%`}`;
}

test.beforeAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await cleanUp(sql);
    const [target]: { id: string }[] =
      await sql`select id from business where slug = ${slug}`;
    const media = [
      [
        mediaWelsh,
        "1",
        "A boiler being serviced",
        "Boeler yn cael ei wasanaethu",
      ],
      [mediaEnglish, "2", "A tidy tool wall", null],
    ] as const;
    for (const [id, index, alt, altCy] of media) {
      await sql`
        insert into business_media
          (id, business_id, role, storage_key, alt_text, alt_text_cy, content_type, byte_size, status)
        values (${id}, ${target!.id}, 'offer', ${`${keyPrefix}/${index}.svg`}, ${alt}, ${altCy},
          'image/svg+xml', 1024, 'active')`;
    }
    for (const [id, title, mediaId] of [
      [offerWelsh, "E2E Welsh picture offer", mediaWelsh],
      [offerEnglish, "E2E English-only picture offer", mediaEnglish],
    ] as const) {
      await sql`
        insert into business_offer (id, business_id, title, description, status, image_media_id)
        values (${id}, ${target!.id}, ${title}, 'A fictional offer for automated tests.', 'active', ${mediaId})`;
    }
  } finally {
    await sql.end();
  }
});

test.afterAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await cleanUp(sql);
  } finally {
    await sql.end();
  }
});

test.beforeEach(async ({ page }) => {
  await page.route(/e2e-picture-welsh\//, (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: picture }),
  );
});

test("Welsh readers hear the Welsh description, marked as Welsh", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto(`/offers/${offerWelsh}`);
  const picture = page.getByRole("img", {
    name: "Boeler yn cael ei wasanaethu",
  });
  await expect(picture).toBeVisible();
  await expect(picture).toHaveAttribute("lang", "cy");
});

test("Welsh readers fall back to the English description, marked as English", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.goto(`/offers/${offerEnglish}`);
  const picture = page.getByRole("img", { name: "A tidy tool wall" });
  await expect(picture).toBeVisible();
  await expect(picture).toHaveAttribute("lang", "en-GB");
});

test("English readers keep the English description and no stray lang", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "ov-locale", value: "en", url: baseURL! }]);
  await page.goto(`/offers/${offerWelsh}`);
  const picture = page.getByRole("img", { name: "A boiler being serviced" });
  await expect(picture).toBeVisible();
  await expect(picture).not.toHaveAttribute("lang", /.+/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
