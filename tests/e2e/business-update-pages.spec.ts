import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

test.skip(!databaseUrl, "database is not configured");

const newerId = "00000000-0000-4000-8000-00000000ab01";
const olderId = "00000000-0000-4000-8000-00000000ab02";
const draftId = "00000000-0000-4000-8000-00000000ab03";
const business = "/b/cwm-coil-heating";

test.describe("business update pages and feeds", () => {
  const sql = postgres(databaseUrl ?? "postgres://invalid", { max: 1 });

  test.beforeAll(async () => {
    const [target]: { id: string }[] =
      await sql`select id from business where slug = 'cwm-coil-heating'`;
    await sql`delete from business_update where id in (${newerId}, ${olderId}, ${draftId})`;
    await sql`
      insert into business_update (id, business_id, title, body, status, published_at)
      values
        (${newerId}, ${target!.id}, 'E2E winter checks', E'Slots open Monday.\n\nCall early.', 'published', now() - interval '1 day'),
        (${olderId}, ${target!.id}, 'E2E bank holiday', 'Closed on Monday.', 'published', now() - interval '6 days'),
        (${draftId}, ${target!.id}, 'E2E secret draft', 'Not public.', 'draft', null)`;
  });

  test.afterAll(async () => {
    await sql`delete from business_update where id in (${newerId}, ${olderId}, ${draftId})`;
    await sql.end();
  });

  test("an update has its own page with neighbours, share and feed links", async ({
    page,
  }) => {
    await page.goto(`${business}/updates/${newerId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "E2E winter checks" }),
    ).toBeVisible();
    await expect(page.getByText("Call early.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Share this update" }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", {
      name: "More updates from this business",
    });
    await expect(
      nav.getByRole("link", { name: /E2E bank holiday/ }),
    ).toBeVisible();
    // The newest update has no newer neighbour, and never links to itself.
    await expect(nav.getByRole("link", { name: /Newer update/ })).toHaveCount(
      0,
    );

    await nav.getByRole("link", { name: /E2E bank holiday/ }).click();
    await expect(page).toHaveURL(new RegExp(`${olderId}$`));
    await expect(
      page
        .getByRole("navigation", { name: "More updates from this business" })
        .getByRole("link", { name: /E2E winter checks/ }),
    ).toBeVisible();
  });

  test("the page passes automated accessibility checks and does not scroll sideways on a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`${business}/updates/${newerId}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "E2E winter checks" }),
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

  test("a draft, an unknown id and a malformed id are not public", async ({
    page,
  }) => {
    for (const id of [
      draftId,
      "00000000-0000-4000-8000-00000000ffff",
      "not-a-uuid",
    ]) {
      const response = await page.goto(`${business}/updates/${id}`);
      expect(response).not.toBeNull();
      await expect(
        page.getByRole("heading", {
          name: "This published business page does not exist.",
        }),
      ).toBeVisible();
      await expect(page.getByText("E2E secret draft")).toHaveCount(0);
    }
  });

  test("the share picture and Atom feeds list published updates only", async ({
    request,
  }) => {
    const image = await request.get(
      `${business}/updates/${newerId}/opengraph-image`,
    );
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");

    for (const path of ["/updates/feed.xml", `${business}/updates/feed.xml`]) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("atom+xml");
      const xml = await response.text();
      expect(xml).toContain(`${business}/updates/${newerId}`);
      expect(xml).toContain("E2E winter checks");
      expect(xml).not.toContain("E2E secret draft");
    }
    expect(
      (await request.get("/b/no-such-business/updates/feed.xml")).status(),
    ).toBe(404);
  });

  test("the updates list links each headline to its page and offers the feed", async ({
    page,
  }) => {
    await page.goto(`${business}/updates`);
    await page.getByRole("link", { name: "E2E winter checks" }).click();
    await expect(page).toHaveURL(new RegExp(`${newerId}$`));
    await page.goto(`${business}/updates`);
    await expect(
      page.getByRole("link", { name: "Follow these updates in a feed reader" }),
    ).toHaveAttribute("href", `${business}/updates/feed.xml`);
  });
});
