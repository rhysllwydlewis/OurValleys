import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { publicBusinessDemoAccount } from "../../src/lib/demo-account";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;
const mediaBase = (
  process.env.R2_PUBLIC_BASE_URL ?? "https://media.ourvalleys.example"
).replace(/\/$/, "");

test.skip(
  !email || !password || !databaseUrl,
  "provisioned E2E account or database is not configured",
);

async function signIn(page: Page) {
  for (let attempt = 1; ; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    try {
      await expect(page).toHaveURL(/\/account$/);
      return;
    } catch (error) {
      if (attempt >= 3) throw error;
      await page.waitForTimeout(11_000);
    }
  }
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
}

async function createBusiness(page: Page): Promise<string> {
  await page.goto("/account/new-business");
  await page.getByLabel("Business name").fill(`Photos Test ${Date.now()}`);
  await page.getByLabel("Narrow the categories").fill("plumb");
  await page.getByRole("radio", { name: /Plumbing/ }).check();
  await page
    .getByRole("combobox", { name: "Where is it based?" })
    .selectOption({ index: 1 });
  await page.getByRole("radio", { name: /We travel to customers/ }).check();
  await page.getByRole("button", { name: "Create my starter website" }).click();
  await expect(page).toHaveURL(/\/dashboard\/business\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

/** The media host is not real in CI, so every photo is answered locally. */
async function stubMedia(page: Page) {
  await page.route(`${mediaBase}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#cfe3d6"/><circle cx="450" cy="120" r="60" fill="#b7774c"/><rect x="60" y="240" width="480" height="120" fill="#173f35"/></svg>`,
    }),
  );
}

async function seedPhotos(businessId: string) {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const rows = [
      ["hero", 0, "The van outside a customer's house in the valley"],
      ["gallery", 0, "A neat boiler installation in a utility room"],
      ["gallery", 1, "Our engineer testing a radiator"],
      ["gallery", 2, ""],
    ] as const;
    for (const [role, sortOrder, altText] of rows) {
      await sql`
        insert into business_media
          (business_id, role, storage_key, alt_text, content_type, byte_size, sort_order)
        values
          (${businessId}, ${role},
           ${`e2e/${businessId}/${role}-${sortOrder}.svg`},
           ${altText}, 'image/svg+xml', 2000, ${sortOrder})`;
    }
  } finally {
    await sql.end();
  }
}

test.describe.configure({ mode: "serial" });

test("a signed-out visitor is sent to sign in", async ({ page }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/photos`,
  );
  await expect(page).toHaveURL(/\/login/);
});

test("an owner frames, describes, reorders and replaces photos in the studio", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(240_000);
  await stubMedia(page);
  await signIn(page);
  const businessId = await createBusiness(page);
  await seedPhotos(businessId);

  // Bad ids and another business are not reachable.
  await page.goto("/dashboard/business/not-a-real-id/photos");
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/photos`,
  );
  await expect(page.getByText("We could not find that page.")).toBeVisible();

  await page.goto(`/dashboard/business/${businessId}`);
  await page
    .getByRole("navigation", { name: "Business dashboard sections" })
    .getByRole("link", { name: "Photos" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/business/${businessId}/photos$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Photos" }),
  ).toBeVisible();

  // The checklist is honest about what is missing.
  const checklist = page.getByRole("complementary", {
    name: "Photo checklist",
  });
  await expect(checklist.getByText("Add a logo")).toBeVisible();
  await expect(
    checklist.getByText("Add 3 gallery photos (3 so far)"),
  ).toBeVisible();
  await expect(checklist.getByText("Describe every photo")).toBeVisible();
  // Uploads are closed without storage credentials, and the page says so.
  await expect(page.getByText(/Photo uploads are switched off/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload photo" })).toHaveCount(
    0,
  );
  await expectAccessible(page);

  // Cover: keyboard, then pointer, move the focus and the previews follow.
  const cover = page.locator("#cover-h").locator("xpath=ancestor::section[1]");
  const vertical = cover.getByLabel("Top to bottom");
  await vertical.focus();
  await page.keyboard.press("ArrowRight");
  await expect(vertical).toHaveValue("51");
  await vertical.fill("80");
  const wideCrop = cover.locator('[data-frame="wide"] img');
  await expect(wideCrop).toHaveCSS("object-position", /50% 80%|50%\s+80%/);
  await expect(cover.getByText("Unsaved changes")).toBeVisible();

  const stage = cover.locator('div[aria-hidden="true"]').first();
  const box = (await stage.boundingBox())!;
  await stage.click({
    position: { x: box.width * 0.25, y: box.height * 0.75 },
  });
  await expect(cover.getByLabel("Left to right")).toHaveValue(/^(2[4-6])$/);
  await expect(vertical).toHaveValue(/^(7[4-6])$/);

  await cover.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByRole("status").first()).toContainText("Photo saved.");
  await page.reload();
  await expect(
    page
      .locator("#cover-h")
      .locator("xpath=ancestor::section[1]")
      .getByLabel("Left to right"),
  ).toHaveValue(/^(2[4-6])$/);

  // Gallery: the undescribed photo is flagged and the server refuses to
  // blank a description.
  await expect(page.getByText("Needs a description")).toHaveCount(1);
  const tile = page.locator("li[id^='photo-']").nth(1);
  await tile.getByText("Edit photo").click();
  await tile.getByLabel("Description").fill("");
  await expect(tile.getByText(/Add a description so everyone/)).toBeVisible();
  await tile.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByRole("alert").first()).toContainText("did not work");

  // Make a gallery photo the cover; the old cover joins the gallery.
  const second = page.locator("li[id^='photo-']").first();
  await second.getByText("Edit photo").click();
  await second
    .getByRole("button", { name: "Make this my cover photo" })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "now your cover photo",
  );
  await expect(
    page
      .locator("#cover-h")
      .locator("xpath=ancestor::section[1]")
      .getByLabel("Description"),
  ).toHaveValue("A neat boiler installation in a utility room");
  await expect(page.locator("li[id^='photo-']")).toHaveCount(3);

  // Removing asks first.
  const last = page.locator("li[id^='photo-']").last();
  await last.getByText("Edit photo").click();
  await last.getByText("Remove this photo").click();
  await expect(
    last.getByText(/takes the photo off your website/),
  ).toBeVisible();
  await last.getByRole("button", { name: "Yes, remove it" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Photo removed.",
  );
  await expect(page.locator("li[id^='photo-']")).toHaveCount(2);

  // Phone width: no sideways scroll, still accessible.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);

  // Welsh interface.
  await page
    .context()
    .addCookies([{ name: "ov-locale", value: "cy", url: baseURL! }]);
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Lluniau" }),
  ).toBeVisible();

  // The shared account may own only five businesses; leave room for others.
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    await sql`delete from business where id = ${businessId}`;
  } finally {
    await sql.end();
  }
});
