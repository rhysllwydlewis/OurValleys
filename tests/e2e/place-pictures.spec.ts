import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { signInAsAdmin } from "./helpers/admin-session";

const slug = "porth";
const altEn = "Terraced houses climbing the hillside in the rain";
const altCy = "Tai teras yn dringo’r bryn yn y glaw";
const credit = "Fictional Test Photographer";

const connection = process.env.DATABASE_URL;

async function withPicture(run: () => Promise<void>) {
  const sql = postgres(connection!, { max: 1 });
  try {
    const [row] = await sql`select id from place where slug = ${slug}`;
    const placeId = row!.id as string;
    await sql`
      insert into place_profile (place_id, image_storage_key, image_alt, image_alt_cy, image_credit, image_content_type, image_byte_size)
      values (${placeId}, ${`places/${placeId}/e2e.png`}, ${altEn}, ${altCy}, ${credit}, 'image/png', 1000)
      on conflict (place_id) do update set
        image_storage_key = excluded.image_storage_key, image_alt = excluded.image_alt,
        image_alt_cy = excluded.image_alt_cy, image_credit = excluded.image_credit`;
    try {
      await run();
    } finally {
      await sql`delete from place_profile where place_id = ${placeId}`;
    }
  } finally {
    await sql.end();
  }
}

test("a place without a picture has no banner", async ({ page }) => {
  await page.goto(`/places/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("place-banner")).toHaveCount(0);
});

test("a signed-out visitor cannot reach the picture editor", async ({
  page,
}) => {
  await page.goto("/admin/places/00000000-0000-4000-8000-000000000001");
  await expect(page.getByTestId("place-picture-card")).toHaveCount(0);
  await expect(page.getByLabel("Description (required)")).toHaveCount(0);
});

test.describe("a place with a picture", () => {
  test.skip(!connection, "This journey seeds a picture through DATABASE_URL.");

  test("shows the banner with its credit, the thumbnail and a Place image", async ({
    page,
  }) => {
    await withPicture(async () => {
      await page.goto(`/places/${slug}`);
      const banner = page.getByTestId("place-banner");
      await expect(banner).toBeVisible();
      await expect(banner.getByRole("img")).toHaveAttribute("alt", altEn);
      await expect(banner.getByText(`Photo: ${credit}`)).toBeVisible();
      const ld = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      expect(ld.some((text) => text.includes('"image"'))).toBe(true);

      await page.goto("/places?q=porth");
      await expect(
        page.getByRole("link", { name: /Porth/ }).locator("img").first(),
      ).toHaveAttribute("alt", "");
    });
  });

  test("gives Welsh readers the Welsh description and credit label", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      { name: "ov-locale", value: "cy", url: "http://127.0.0.1:3000" },
    ]);
    await withPicture(async () => {
      await page.goto(`/places/${slug}`);
      const banner = page.getByTestId("place-banner");
      await expect(banner.getByRole("img")).toHaveAttribute("alt", altCy);
      await expect(banner.getByRole("img")).toHaveAttribute("lang", "cy");
      await expect(banner.getByText(`Llun: ${credit}`)).toBeVisible();
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
        await page.goto(`/places/${slug}`);
        await expect(page.getByTestId("place-banner")).toBeVisible();
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    });
  }

  test("passes an accessibility scan with a banner", async ({ page }) => {
    await withPicture(async () => {
      await page.goto(`/places/${slug}`);
      await expect(page.getByTestId("place-banner")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
});

test("an admin sees the picture card, with upload explained when storage is off", async ({
  page,
}) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(
    !email || !password,
    "This journey requires an ephemeral provisioned admin account.",
  );

  await signInAsAdmin(page, email!, password!);
  await page.goto("/admin/places");
  await page
    .getByRole("link", { name: /^Edit profile for Porth/ })
    .first()
    .click();
  const card = page.getByTestId("place-picture-card");
  await expect(card).toBeVisible();
  await expect(card.getByLabel("Description (required)")).toBeVisible();
  // Nothing can be saved without a chosen file and a description.
  await expect(
    card.getByRole("button", { name: "Save description" }),
  ).toBeDisabled();
  await expect(
    card.getByRole("button", { name: "Remove picture" }),
  ).toHaveCount(0);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
