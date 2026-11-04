import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
test.skip(!databaseUrl, "database is not configured");

// Fictional photos on the seeded demo business; removed again afterwards.
const slug = "cwm-coil-heating";
const keyPrefix = "e2e-gallery";
const photoCount = 8;

const picture =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#3d6b5a"/></svg>';

test.beforeAll(async () => {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business_media where storage_key like ${`${keyPrefix}/%`}`;
    for (let index = 1; index <= photoCount; index += 1) {
      await sql`
        insert into business_media
          (business_id, role, storage_key, alt_text, content_type, byte_size, sort_order, status)
        select id, 'gallery', ${`${keyPrefix}/${index}.svg`},
          ${index === 3 ? "" : `Workshop view number ${index}`},
          'image/svg+xml', 1024, ${1000 + index}, 'active'
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
  // The pictures live on an external host; serve a stand-in so layout is real.
  await page.route(/\/e2e-gallery\//, (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: picture }),
  );
});

/** Waits until React has attached its handlers to the thumbnails. */
async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const link = document.querySelector('a[aria-label^="Enlarge photo"]');
    return Boolean(
      link && Object.keys(link).some((key) => key.startsWith("__reactProps")),
    );
  });
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

test("the website previews six photos and links to the full gallery", async ({
  page,
}) => {
  await page.goto(`/b/${slug}#gallery`);
  const section = page.locator("#gallery");
  await expect(
    section.getByRole("link", { name: /Enlarge photo/ }),
  ).toHaveCount(6);
  const seeAll = section.getByRole("link", { name: "See all 8 photos" });
  await expect(seeAll).toHaveAttribute("href", `/b/${slug}/gallery`);
  await seeAll.click();
  await expect(page).toHaveURL(new RegExp(`/b/${slug}/gallery$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Photo gallery" }),
  ).toBeVisible();
  await expect(page.getByText("8 photos", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Enlarge photo/ })).toHaveCount(
    photoCount,
  );
  // Demonstration businesses are never indexed.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expectAccessible(page);
});

test("the viewer opens, steps with the keyboard, wraps and closes returning focus", async ({
  page,
}) => {
  await page.goto(`/b/${slug}/gallery`);
  // Let the client hydrate so the click opens the viewer, not the picture.
  await waitForHydration(page);
  const first = page.getByRole("link", {
    name: "Enlarge photo: Workshop view number 1",
  });
  await first.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Photo viewer" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("status")).toHaveText("Photo 1 of 8");
  await expect(
    dialog.getByRole("img", { name: "Workshop view number 1" }),
  ).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("status")).toHaveText("Photo 2 of 8");
  // A photo with no description is still named by its position.
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("img", { name: "Photo 3 of 8" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(dialog.getByRole("status")).toHaveText("Photo 8 of 8");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("status")).toHaveText("Photo 1 of 8");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByRole("status")).toHaveText("Photo 8 of 8");
  await expectAccessible(page);

  await dialog.getByRole("button", { name: "Next photo" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Photo 1 of 8");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(first).toBeFocused();
  // The dialog's close event fires a moment after it hides, so poll.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .toBe("");
});

test("the close button and a backdrop click both dismiss the viewer", async ({
  page,
}) => {
  await page.goto(`/b/${slug}/gallery`);
  const dialog = page.getByRole("dialog", { name: "Photo viewer" });
  await page
    .getByRole("link", { name: /Enlarge photo/ })
    .first()
    .click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close photo viewer" }).click();
  await expect(dialog).toBeHidden();

  await page
    .getByRole("link", { name: /Enlarge photo/ })
    .first()
    .click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeHidden();
});

test("the gallery reflows on a phone and the Welsh page is translated", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(`/b/${slug}/gallery`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: page.url() }]);
  await page.goto(`/b/${slug}/gallery`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Oriel luniau" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Chwyddo'r llun/ }).first(),
  ).toBeVisible();
});

test("a business with no photos or an unknown slug has no gallery page", async ({
  page,
}) => {
  for (const path of [
    "/b/not-a-real-business/gallery",
    "/b/rhondda-home-tutoring/gallery",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { level: 1, name: "Photo gallery" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Enlarge photo/ })).toHaveCount(
      0,
    );
  }
});
