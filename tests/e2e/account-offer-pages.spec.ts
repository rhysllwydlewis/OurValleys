import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

// Named so it runs before account-settings and homepage specs, which change
// the shared provisioned account's password.
test.skip(
  !email || !password || !databaseUrl,
  "provisioned E2E account or database is not configured",
);

const seededOfferId = "00000000-0000-4000-8000-000000001101";
const endedOfferId = "00000000-0000-4000-8000-00000000fa01";
const draftOfferId = "00000000-0000-4000-8000-00000000fa02";

async function signIn(page: Page, next = "/account") {
  for (let attempt = 1; ; attempt += 1) {
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    await page.getByLabel("Email address").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    try {
      await expect(page).toHaveURL(
        new RegExp(`${next.replace(/[?/]/g, "\\$&")}$`),
      );
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
  expect(
    results.violations.map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

test.describe("offer pages", () => {
  const sql = postgres(databaseUrl ?? "postgres://invalid", { max: 1 });
  let userId = "";

  test.beforeAll(async () => {
    const [row]: { id: string }[] =
      await sql`select id from auth_user where email = ${email!}`;
    userId = row!.id;
    const [target]: { id: string }[] =
      await sql`select id from business where slug = 'cwm-coil-heating'`;
    await sql`delete from resident_saved_offer where user_id = ${userId}`;
    await sql`delete from business_offer where id in (${endedOfferId}, ${draftOfferId})`;
    await sql`
      insert into business_offer (id, business_id, title, description, status, ends_at)
      values (${endedOfferId}, ${target!.id}, 'E2E ended offer', 'An offer that finished a few days ago.', 'active', now() - interval '3 days')`;
    await sql`
      insert into business_offer (id, business_id, title, description, status)
      values (${draftOfferId}, ${target!.id}, 'E2E draft offer', 'Not public.', 'draft')`;
  });

  test.afterAll(async () => {
    await sql`delete from business_offer where id in (${endedOfferId}, ${draftOfferId})`;
    await sql`delete from resident_saved_offer where user_id = ${userId}`;
    await sql.end();
  });

  test("a visitor opens an offer from the list, reads it, and is asked to sign in to save it", async ({
    page,
  }) => {
    await page.goto("/offers");
    const card = page
      .locator("article")
      .filter({ hasText: "Coil Heating" })
      .first();
    await card.getByRole("heading").getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/offers/${seededOfferId}$`));

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Terms and conditions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "All local offers" }).first(),
    ).toBeVisible();
    await expectAccessible(page);

    // The share picture exists for this page.
    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(ogImage).toContain(`/offers/${seededOfferId}/opengraph-image`);

    await page.getByRole("button", { name: "Save this offer" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Foffers%2F/);
  });

  test("the page holds up on a phone and a tablet, with reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/offers/${seededOfferId}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  test("an ended offer explains itself, and a draft or unknown offer is not found", async ({
    page,
  }) => {
    await page.goto(`/offers/${endedOfferId}`);
    await expect(
      page.getByRole("heading", { name: "This offer has ended" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save this offer" }),
    ).toHaveCount(0);
    await expect(
      page.locator('meta[name="robots"][content*="noindex"]').first(),
    ).toBeAttached();
    await expectAccessible(page);

    // Streaming starts before the lookup finishes, so the status line is
    // not a reliable signal; the page content and indexing are.
    for (const path of [`/offers/${draftOfferId}`, "/offers/not-an-offer"]) {
      await page.goto(path);
      await expect(page.getByText("E2E draft offer")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
        "E2E draft offer",
      );
      await expect(
        page.getByRole("link", { name: "Save this offer" }),
      ).toHaveCount(0);
      await expect(
        page.locator('meta[name="robots"][content*="noindex"]').first(),
      ).toBeAttached();
    }
  });

  test("a resident saves an offer, sees it in their saved items, and removes it", async ({
    page,
  }) => {
    await signIn(page, `/offers/${seededOfferId}`);
    await page.getByRole("button", { name: "Save this offer" }).click();
    await expect(page.getByText("Offer saved to your account.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Remove from saved" }),
    ).toBeVisible();

    await page.goto("/account/saved?tab=offers");
    await expect(
      page.getByRole("heading", { name: "Saved offers" }),
    ).toBeVisible();
    const row = page
      .locator("li")
      .filter({ has: page.getByRole("link", { name: /View offer/ }) })
      .first();
    await expect(row).toBeVisible();
    await expectAccessible(page);

    await page
      .getByRole("button", { name: /^Remove/ })
      .first()
      .click();
    await expect(page.getByText(/removed/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /View offer/ })).toHaveCount(0);
  });

  test("the saved-offer notice reaches the notification centre in Welsh", async ({
    page,
    baseURL,
  }) => {
    await sql`delete from account_notification where user_id = ${userId}`;
    await sql`
      insert into account_notification (user_id, kind, params, href, dedupe_key)
      values (${userId}, 'saved_offer_ending', ${sql.json({ title: "E2E offer", business: "E2E Cafe" })}, ${`/offers/${seededOfferId}`}, 'e2e-offer-ending')`;
    await signIn(page, "/account/notifications");
    await page
      .context()
      .addCookies([
        { name: "ov-locale", value: "cy", url: baseURL ?? "", httpOnly: true },
      ]);
    await page.goto("/account/notifications");
    await expect(
      page.getByRole("heading", {
        name: "Mae cynnig a gadwyd yn dod i ben cyn bo hir",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Agor/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/offers/${seededOfferId}$`));
    await expect(
      page.getByRole("heading", { name: "Telerau ac amodau" }),
    ).toBeVisible();
    await sql`delete from account_notification where user_id = ${userId}`;
  });
});
