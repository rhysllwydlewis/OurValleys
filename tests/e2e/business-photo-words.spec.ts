import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
test.skip(!databaseUrl, "database is not configured");

// Fictional photos on the seeded demo business; removed again afterwards.
const slug = "cwm-coil-heating";
const keyPrefix = "e2e-photo-words";

const picture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#3d6b5a"/></svg>';

test.beforeAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business_media where storage_key like ${`${keyPrefix}/%`}`;
    const rows = [
      // Welsh description and caption written.
      [
        "1",
        "Boiler servicing in the workshop",
        "Gwasanaethu boeler yn y gweithdy",
        "Serviced by hand",
        "Gwasanaethu â llaw",
      ],
      // English caption only: Welsh readers fall back per field.
      ["2", "The van outside the yard", null, "Fully stocked", null],
      // Description only, no caption anywhere.
      ["3", "A tidy tool wall", null, null, null],
      // Caption but no description: the caption names the tile.
      ["4", "", null, "Our yard at dawn", null],
    ] as const;
    for (const [index, alt, altCy, caption, captionCy] of rows) {
      await sql`
        insert into business_media
          (business_id, role, storage_key, alt_text, alt_text_cy, caption, caption_cy,
           content_type, byte_size, sort_order, status)
        select id, 'gallery', ${`${keyPrefix}/${index}.svg`}, ${alt}, ${altCy}, ${caption}, ${captionCy},
          'image/svg+xml', 1024, ${2000 + Number(index)}, 'active'
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
  await page.route(/\/e2e-photo-words\//, (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: picture }),
  );
});

async function hydrated(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => {
    const link = document.querySelector(
      'a[aria-label^="Enlarge photo"], a[aria-label^="Chwyddo"]',
    );
    return Boolean(
      link && Object.keys(link).some((key) => key.startsWith("__reactProps")),
    );
  });
}

test("English readers see captions on the tiles and in the viewer", async ({
  page,
}) => {
  await page.goto(`/b/${slug}/gallery`);
  await hydrated(page);
  await expect(page.getByText("Serviced by hand").first()).toBeVisible();
  await page
    .getByRole("link", {
      name: "Enlarge photo: Boiler servicing in the workshop",
    })
    .click();
  const dialog = page.getByRole("dialog", { name: "Photo viewer" });
  await expect(dialog.getByText("Serviced by hand")).toBeVisible();
  await expect(
    dialog.getByRole("img", { name: "Boiler servicing in the workshop" }),
  ).toHaveAttribute("lang", "en-GB");
  await page.keyboard.press("Escape");
});

test("Welsh readers get the Welsh words, marked cy, with English per-field fallback", async ({
  page,
}) => {
  await page.goto(`/b/${slug}/gallery`);
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: page.url() }]);
  await page.goto(`/b/${slug}/gallery`);
  await hydrated(page);

  const welsh = page.getByRole("link", {
    name: /Gwasanaethu boeler yn y gweithdy/,
  });
  await expect(welsh).toBeVisible();
  await expect(welsh.locator("span[lang]")).toHaveAttribute("lang", "cy");
  await expect(welsh.locator("span[lang]")).toHaveText("Gwasanaethu â llaw");

  // No Welsh text written: the owner's English shows, marked English.
  const english = page.getByRole("link", {
    name: /The van outside the yard/,
  });
  await expect(english.locator("span[lang]")).toHaveAttribute("lang", "en-GB");
  await expect(english.locator("span[lang]")).toHaveText("Fully stocked");

  // A photo with no caption has no caption element.
  await expect(
    page.getByRole("link", { name: /A tidy tool wall/ }).locator("span[lang]"),
  ).toHaveCount(0);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});

test("captions do not overflow on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/b/${slug}/gallery`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a photo with only a caption is named by its caption in the grid", async ({
  page,
}) => {
  await page.goto(`/b/${slug}/gallery`);
  await expect(
    page.getByRole("link", { name: "Enlarge photo: Our yard at dawn" }),
  ).toBeVisible();
});

test("the caption is part of the tile's accessible name", async ({ page }) => {
  await page.goto(`/b/${slug}/gallery`);
  await expect(
    page.getByRole("link", {
      name: "Enlarge photo: The van outside the yard. Fully stocked",
    }),
  ).toBeVisible();
});
