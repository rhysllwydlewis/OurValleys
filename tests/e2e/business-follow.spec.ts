import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

test.skip(!databaseUrl, "database is not configured");

const publishedId = "00000000-0000-4000-8000-00000000fb01";
const draftId = "00000000-0000-4000-8000-00000000fb02";
const business = "/b/cwm-coil-heating";

test.describe("follow a business", () => {
  const sql = postgres(databaseUrl ?? "postgres://invalid", { max: 1 });

  test.beforeAll(async () => {
    const [target]: { id: string }[] =
      await sql`select id from business where slug = 'cwm-coil-heating'`;
    await sql`delete from business_update where id in (${publishedId}, ${draftId})`;
    await sql`
      insert into business_update (id, business_id, title, body, status, published_at)
      values
        (${publishedId}, ${target!.id}, 'E2E follow update', 'Slots open.', 'published', now() - interval '1 day'),
        (${draftId}, ${target!.id}, 'E2E follow secret draft', 'Not public.', 'draft', null)`;
  });

  test.afterAll(async () => {
    await sql`delete from business_update where id in (${publishedId}, ${draftId})`;
    await sql.end();
  });

  test("the follow page lists every feed with copyable addresses", async ({
    page,
  }) => {
    await page.goto(`${business}/follow`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Follow Cwm & Coil Heating",
      }),
    ).toBeVisible();
    for (const name of [
      "Updates",
      "Offers",
      "Events feed",
      "Events in your calendar",
    ]) {
      await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    }
    await expect(
      page.getByLabel("Feed address for Updates", { exact: true }),
    ).toHaveValue(/\/b\/cwm-coil-heating\/updates\/feed\.xml$/);
    await expect(
      page.getByRole("link", { name: "Subscribe in calendar app" }),
    ).toHaveAttribute("href", /^webcal:\/\/.+\/events\/feed\.ics$/);
    // A demonstration business is never offered to search engines.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("the follow page passes accessibility checks and fits a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`${business}/follow`);
    await expect(
      page.getByRole("heading", { level: 1, name: /Follow Cwm/ }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);
  });

  test("the follow page reads in Welsh", async ({ page, context, baseURL }) => {
    await context.addCookies([
      {
        name: "ov-locale",
        value: "cy",
        url: baseURL ?? "http://127.0.0.1:3000",
      },
    ]);
    await page.goto(`${business}/follow`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Dilyn Cwm & Coil Heating" }),
    ).toBeVisible();
  });

  test("the business page links to the follow page and advertises its feeds", async ({
    page,
  }) => {
    await page.goto(business);
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Follow us" })
      .click();
    await expect(page).toHaveURL(/\/follow$/);
    await page.goto(business);
    const feeds = await page
      .locator('link[rel="alternate"][type="application/atom+xml"]')
      .evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    for (const feed of ["updates", "offers", "events"]) {
      expect(
        feeds.some((href) => href?.endsWith(`${business}/${feed}/feed.xml`)),
      ).toBe(true);
    }
  });

  test("the per-business feeds serve only that business's public content", async ({
    request,
  }) => {
    const updates = await request.get(`${business}/updates/feed.xml`);
    expect(updates.status()).toBe(200);
    const updatesXml = await updates.text();
    expect(updatesXml).toContain("E2E follow update");
    expect(updatesXml).not.toContain("E2E follow secret draft");

    const offers = await request.get(`${business}/offers/feed.xml`);
    expect(offers.status()).toBe(200);
    expect(offers.headers()["content-type"]).toContain("application/atom+xml");
    expect(await offers.text()).toContain("Free fictional heating check");

    const events = await request.get(`${business}/events/feed.xml`);
    expect(events.status()).toBe(200);
    expect(await events.text()).toContain("Fictional home-heating question");

    const ics = await request.get(`${business}/events/feed.ics`);
    expect(ics.status()).toBe(200);
    expect(ics.headers()["content-type"]).toContain("text/calendar");
    const calendar = await ics.text();
    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("Cwm & Coil Heating events");
  });

  test("an unknown business has no feeds and no follow page", async ({
    request,
    page,
  }) => {
    for (const path of [
      "updates/feed.xml",
      "offers/feed.xml",
      "events/feed.xml",
      "events/feed.ics",
    ]) {
      const response = await request.get(`/b/no-such-business-e2e/${path}`);
      expect(response.status()).toBe(404);
      expect(await response.text()).toBe("Not found");
    }
    await page.goto("/b/no-such-business-e2e/follow");
    await expect(
      page.getByRole("heading", {
        name: "This published business page does not exist.",
      }),
    ).toBeVisible();
  });
});
