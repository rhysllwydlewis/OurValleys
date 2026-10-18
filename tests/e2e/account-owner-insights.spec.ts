import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { publicBusinessDemoAccount } from "../../src/lib/demo-account";

const email = process.env.E2E_ACCOUNT_EMAIL;
const password = process.env.E2E_ACCOUNT_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

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
  await page.getByLabel("Business name").fill(`Insights Test ${Date.now()}`);
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

/** Activity is written directly: the public beacon only counts published sites. */
async function seedActivity(businessId: string) {
  const sql = postgres(databaseUrl!, { max: 1 });
  try {
    const rows: [string, string, string | null, string][] = [
      // [event type, source, visitor, age]
      ...Array.from(
        { length: 6 },
        (_, index): [string, string, string | null, string] => [
          "website_view",
          "directory",
          `visitor-${index}`,
          `${index + 1} hours`,
        ],
      ),
      ["website_view", "qr", "visitor-qr-1", "2 hours"],
      ["website_view", "qr", "visitor-qr-2", "3 days"],
      ["website_view", "search_engine", "visitor-se-1", "2 days"],
      ["website_view", "social", "visitor-so-1", "4 days"],
      ["website_view", "direct", "visitor-d-1", "5 days"],
      ["website_view", "direct", "visitor-d-2", "6 days"],
      ["website_view", "directory", "visitor-prev", "40 days"],
      ["qr_visit", "qr", "visitor-qr-1", "2 hours"],
      ["search_appearance", "directory", null, "1 day"],
      ["search_appearance", "directory", null, "2 days"],
      ["search_appearance", "directory", null, "3 days"],
      ["search_appearance", "directory", null, "4 days"],
      ["call_click", "business_website", "visitor-0", "1 hour"],
      ["call_click", "offer", "visitor-1", "2 hours"],
      ["email_click", "business_website", "visitor-2", "3 hours"],
      ["enquiry", "business_website", "visitor-3", "4 hours"],
    ];
    for (const [eventType, source, visitor, age] of rows) {
      await sql`
        insert into business_activity_event
          (business_id, event_type, source, visitor_hash, occurred_at)
        values
          (${businessId}, ${eventType}, ${source}, ${visitor}, now() - ${age}::interval)`;
    }
  } finally {
    await sql.end();
  }
}

test.describe.configure({ mode: "serial" });
let businessId = "";
let insights = "";

test("a signed-out visitor is sent to sign in", async ({ page, request }) => {
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/insights`,
  );
  await expect(page).toHaveURL(/\/login/);
  const csv = await request.get(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/insights/export`,
    { maxRedirects: 0 },
  );
  expect(csv.status()).not.toBe(200);
});

test("an owner reads where visitors came from and downloads the figures", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await signIn(page);
  businessId = await createBusiness(page);
  insights = `/dashboard/business/${businessId}/insights`;

  // Not found for a bad id and for a business the owner is not a member of.
  await page.goto("/dashboard/business/not-a-real-id/insights");
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  await page.goto(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/insights`,
  );
  await expect(page.getByText("We could not find that page.")).toBeVisible();
  const foreign = await page.request.get(
    `/dashboard/business/${publicBusinessDemoAccount.businessId}/insights/export`,
  );
  expect(foreign.status()).toBe(403);

  // A business with no activity says so and offers the next step.
  await page.goto(insights);
  await expect(
    page.getByRole("heading", { level: 1, name: "Insights" }),
  ).toBeVisible();
  await expect(page.getByText("No visits recorded yet")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download daily figures (CSV)" }),
  ).toHaveCount(0);
  await expectAccessible(page);

  await seedActivity(businessId);
  await page.goto(insights);

  // The tab is in the shared dashboard navigation and marked current.
  await expect(
    page
      .getByRole("navigation", { name: "Business dashboard sections" })
      .getByRole("link", { name: "Insights" }),
  ).toHaveAttribute("aria-current", "page");

  const kpis = page.getByRole("region", { name: "Key figures" });
  await expect(kpis.getByText("Page views")).toBeVisible();
  await expect(kpis.getByText("QR code scans")).toBeVisible();

  // Sources are named in words, largest first.
  const sources = page.getByRole("region", {
    name: "Where visitors came from",
  });
  await expect(sources.getByText("The Our Valleys directory")).toBeVisible();
  await expect(sources.getByText("Your QR code")).toBeVisible();
  await expect(sources.getByText("A search engine")).toBeVisible();
  await expect(sources.getByText("Social media or messaging")).toBeVisible();
  await expect(sources.getByText("A direct link or bookmark")).toBeVisible();
  await expect(sources).toContainText("50% · 6 visits");

  // Contact channels and where on the site they were used.
  const channels = page.getByRole("region", {
    name: "How people got in touch",
  });
  await expect(channels.getByText("Call button")).toBeVisible();
  await expect(channels.getByText("Email button")).toBeVisible();
  await expect(channels.getByText("Enquiry form messages")).toBeVisible();
  await expect(channels.getByText("Offers")).toBeVisible();

  // Twelve visits are too few to quote a rate honestly.
  await expect(
    page.getByText("Too few visits so far to give a fair rate."),
  ).toBeVisible();

  // Every chart has a table with the same figures.
  await page.getByText("Show the figures as a table").click();
  await expect(
    page.getByRole("table", { name: /Daily figures for the last 30 days/ }),
  ).toBeVisible();

  // The period can be changed and is reflected in the page.
  await page.getByRole("link", { name: "7 days" }).click();
  await expect(page).toHaveURL(/period=7/);
  await expect(page.getByRole("link", { name: "7 days" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  // The CSV holds only dates and counts.
  const download = await page.request.get(`${insights}/export?period=30`);
  expect(download.status()).toBe(200);
  expect(download.headers()["content-type"]).toContain("text/csv");
  expect(download.headers()["content-disposition"]).toContain("insights-30");
  const body = await download.text();
  expect(body.split("\r\n")[0]).toBe("date,views,contact_actions,enquiries");
  const views = body
    .trim()
    .split("\r\n")
    .slice(1)
    .reduce((sum, line) => sum + Number(line.split(",")[1]), 0);
  expect(views).toBe(12);
  expect(body).not.toMatch(/visitor|@/);

  await page.goto(insights);
  await expectAccessible(page);
});

test("on a phone the page reflows without sideways scrolling", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto(insights);
  await expect(
    page.getByRole("region", { name: "Where visitors came from" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectAccessible(page);
});

test("insights read in Welsh", async ({ page, context }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await context.addCookies([
    { name: "ov-locale", value: "cy", url: page.url() },
  ]);
  await page.goto(insights);
  await expect(
    page.getByRole("heading", { level: 1, name: "Mewnwelediad" }),
  ).toBeVisible();
  await expect(page.getByText("O ble y daeth ymwelwyr")).toBeVisible();
});
