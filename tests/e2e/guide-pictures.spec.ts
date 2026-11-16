import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { signInAsAdmin } from "./helpers/admin-session";

// Seeded fictional guides (scripts/seed.ts).
const slug = "a-practical-afternoon-in-porth";
const otherSlug = "valley-trails-for-a-clear-day";
const otherGuideId = "00000000-0000-4000-8000-000000002003";
const altEn = "Terraced streets below a green hillside";
const altCy = "Strydoedd teras islaw llechwedd gwyrdd";
const credit = "Fictional Test Photographer";

const connection = process.env.DATABASE_URL;

/**
 * Media storage is not configured in CI, so a picture is seeded straight into
 * the guide's columns. Only pages that read the guide live are asserted on:
 * the guides index and the homepage read a one-minute cache.
 */
async function withPicture(run: (key: string) => Promise<void>) {
  const sql = postgres(connection!, { max: 1 });
  try {
    const [row] = await sql`select id from guide where slug = ${slug}`;
    const guideId = row!.id as string;
    const key = `guides/${guideId}/e2e.png`;
    await sql`
      update guide set image_storage_key = ${key}, image_alt = ${altEn},
        image_alt_cy = ${altCy}, image_credit = ${credit},
        image_content_type = 'image/png', image_byte_size = 1000
      where id = ${guideId}`;
    try {
      await run(key);
    } finally {
      await sql`
        update guide set image_storage_key = null, image_alt = null,
          image_alt_cy = null, image_credit = null,
          image_content_type = null, image_byte_size = null
        where id = ${guideId}`;
    }
  } finally {
    await sql.end();
  }
}

test("a guide without its own picture has no banner, and its cards use stock pictures", async ({
  page,
}) => {
  await page.goto(`/guides/${otherSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("guide-hero")).toHaveCount(0);
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const article = ld.find((text) => text.includes('"Article"'));
  expect(article).toBeTruthy();
  expect(article).not.toContain('"image"');

  // Related guides each lead with a decorative picture.
  const related = page.locator("#guide-related-title + ul > li");
  const count = await related.count();
  expect(count).toBeGreaterThan(0);
  await expect(related.locator("img")).toHaveCount(count);
  for (const image of await related.locator("img").all()) {
    await expect(image).toHaveAttribute("alt", "");
  }
});

test("every card on the guides index leads with a picture", async ({
  page,
}) => {
  await page.goto("/guides");
  const featured = page.getByTestId("featured-guide");
  await expect(featured.locator("[data-guide-card-picture] img")).toHaveCount(
    1,
  );
  const cards = page.getByTestId("guide-card");
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  await expect(cards.locator("[data-guide-card-picture] img")).toHaveCount(
    count,
  );
  // Stock pictures are local files and really load.
  const loaded = await cards
    .locator("[data-guide-card-picture] img")
    .first()
    .evaluate(
      (image: HTMLImageElement) =>
        new Promise<boolean>((resolve) => {
          if (image.complete) return resolve(image.naturalWidth > 0);
          image.addEventListener("load", () => resolve(true), { once: true });
          image.addEventListener("error", () => resolve(false), {
            once: true,
          });
          image.loading = "eager";
        }),
    );
  expect(loaded).toBe(true);
});

test("a signed-out visitor cannot reach the picture editor", async ({
  page,
}) => {
  await page.goto(`/admin/guides/${otherGuideId}`);
  await expect(page.getByTestId("guide-picture-card")).toHaveCount(0);
  await expect(page.getByLabel("Description (required)")).toHaveCount(0);
});

test.describe("a guide with its own picture", () => {
  test.skip(!connection, "This journey seeds a picture through DATABASE_URL.");

  test("shows the banner with its credit and names it as the Article image", async ({
    page,
  }) => {
    await withPicture(async (key) => {
      await page.goto(`/guides/${slug}`);
      const hero = page.getByTestId("guide-hero");
      await expect(hero).toBeVisible();
      await expect(hero.getByRole("img")).toHaveAttribute("alt", altEn);
      // English description inside an English article needs no language mark.
      await expect(hero.getByRole("img")).not.toHaveAttribute("lang");
      await expect(hero.getByText(`Photo: ${credit}`)).toBeVisible();
      const ld = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      const article = ld.find((text) => text.includes('"Article"'));
      expect(article).toContain('"image"');
      expect(article).toContain(key);
    });
  });

  test("gives Welsh readers the Welsh description and credit label", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "ov-locale", value: "cy", url: baseURL! },
    ]);
    await withPicture(async () => {
      await page.goto(`/guides/${slug}`);
      const hero = page.getByTestId("guide-hero");
      await expect(hero.getByRole("img")).toHaveAttribute("alt", altCy);
      // The seeded guide's text is English, so the Welsh words are marked.
      await expect(hero.getByRole("img")).toHaveAttribute("lang", "cy");
      await expect(hero.getByText(`Llun: ${credit}`)).toBeVisible();
    });
  });

  test("uses the picture on the guide's cards elsewhere", async ({ page }) => {
    await withPicture(async (key) => {
      // As a related guide under another article.
      await page.goto(`/guides/${otherSlug}`);
      const card = page
        .locator("#guide-related-title + ul > li")
        .filter({ hasText: "A practical afternoon in Porth" });
      await expect(card).toHaveCount(1);
      // Optimised or as stored, the address names the guide's own file.
      const source = await card
        .locator("img")
        .evaluate(
          (image: HTMLImageElement) =>
            `${image.getAttribute("src")} ${image.getAttribute("srcset") ?? ""}`,
        );
      expect(decodeURIComponent(source)).toContain(key);

      // And on the page of the place the guide is about.
      await page.goto("/places/porth");
      const placeCard = page
        .locator("article")
        .filter({ hasText: "A practical afternoon in Porth" });
      const placeSource = await placeCard
        .locator("[data-guide-card-picture] img")
        .evaluate(
          (image: HTMLImageElement) =>
            `${image.getAttribute("src")} ${image.getAttribute("srcset") ?? ""}`,
        );
      expect(decodeURIComponent(placeSource)).toContain(key);
    });
  });

  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["tablet", 820, 1180],
    ["mobile", 390, 844],
  ] as const) {
    test(`the banner reflows without horizontal scroll on ${name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await withPicture(async () => {
        await page.goto(`/guides/${slug}`);
        const hero = page.getByTestId("guide-hero");
        await expect(hero).toBeVisible();
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
        const box = await hero.boundingBox();
        expect(box!.width).toBeLessThanOrEqual(width);
      });
    });
  }

  test("passes an accessibility scan with a banner", async ({ page }) => {
    await withPicture(async () => {
      await page.goto(`/guides/${slug}`);
      await expect(page.getByTestId("guide-hero")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
});

test("an admin sees the picture card in the guide studio, with upload explained when storage is off", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  await signInAsAdmin(page, email!, password!);

  // A guide that does not exist yet cannot have a picture.
  await page.goto("/admin/guides/new");
  const pending = page.getByTestId("guide-picture-card");
  await expect(pending).toContainText("Create the guide first");
  await expect(pending.getByLabel("Description (required)")).toHaveCount(0);

  await page.goto(`/admin/guides/${otherGuideId}`);
  const card = page.getByTestId("guide-picture-card");
  await expect(card).toBeVisible();
  await expect(card.getByText(/No picture yet/)).toBeVisible();
  // CI has no media storage: the card says so and the file field is closed.
  await expect(card.getByRole("note")).toContainText(
    "Picture storage is not set up",
  );
  await expect(card.getByLabel("Choose a picture")).toBeDisabled();
  // Nothing can be saved without a picture, even with a description typed.
  await card.getByLabel("Description (required)").fill("Hills above a town");
  await expect(
    card.getByRole("button", { name: "Save description" }),
  ).toBeDisabled();
  await expect(
    card.getByRole("button", { name: "Remove picture" }),
  ).toHaveCount(0);
  // Typing in the card does not mark the guide's words as unsaved.
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  // The studio suggests adding one, without blocking publication.
  await expect(
    page.getByText(/Add a picture: cards and the article/),
  ).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
