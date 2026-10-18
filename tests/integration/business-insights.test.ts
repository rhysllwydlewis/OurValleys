import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import { businessActivityEvent } from "@/lib/database/schema/business-operations";
import {
  getBusinessAnalyticsSummary,
  getBusinessDailyActivity,
} from "@/modules/businesses/analytics";
import {
  getClickSurfaces,
  getTrafficSources,
  getVisitorEstimate,
} from "@/modules/businesses/insights";
import {
  buildInsightsCsv,
  buildWeekdayPattern,
} from "@/modules/businesses/insights-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000961",
  businessId: "00000000-0000-4000-8000-000000000962",
  otherBusinessId: "00000000-0000-4000-8000-000000000963",
} as const;

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000);

describeDatabase("business insights queries", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture insights services",
      slug: "fixture-insights-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [fixture.businessId, "insights-fixture-studio"],
        [fixture.otherBusinessId, "other-insights-fixture-studio"],
      ].map(([id, slug]) => ({
        id: id!,
        tradingName: `Fixture ${slug}`,
        slug: slug!,
        summary: "A fictional business used only by insights tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company" as const,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    const ids = [fixture.businessId, fixture.otherBusinessId];
    await database
      .delete(businessActivityEvent)
      .where(inArray(businessActivityEvent.businessId, ids));
    await database.delete(business).where(inArray(business.id, ids));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function record(
    eventType: string,
    options: {
      source?: string;
      visitorHash?: string | null;
      hoursAgo?: number;
      businessId?: string;
    } = {},
  ) {
    await getDatabase()
      .insert(businessActivityEvent)
      .values({
        businessId: options.businessId ?? fixture.businessId,
        eventType,
        source: options.source ?? "direct",
        visitorHash: options.visitorHash ?? null,
        occurredAt: hoursAgo(options.hoursAgo ?? 1),
      });
  }

  it("groups page views by where visitors came from, folding unknown labels", async () => {
    await record("website_view", { source: "qr" });
    await record("website_view", { source: "qr" });
    await record("website_view", { source: "directory" });
    await record("website_view", { source: "direct" });
    await record("website_view", { source: "something-old-and-odd" });
    // Other event types and old views are not traffic in this period.
    await record("qr_visit", { source: "qr" });
    await record("call_click", { source: "business_website" });
    await record("website_view", { source: "map", hoursAgo: 24 * 40 });

    const sources = (await getTrafficSources(fixture.businessId, 30))!;
    expect(sources.map((row) => [row.source, row.count])).toEqual([
      ["qr", 2],
      ["directory", 1],
      ["other_site", 1],
      ["direct", 1],
    ]);
    expect(sources.reduce((sum, row) => sum + row.percent, 0)).toBe(100);
  });

  it("never counts another business's traffic", async () => {
    await record("website_view", { source: "map" });
    await record("website_view", {
      source: "social",
      businessId: fixture.otherBusinessId,
    });
    await record("call_click", {
      source: "offer",
      businessId: fixture.otherBusinessId,
    });

    expect(
      (await getTrafficSources(fixture.businessId, 30))!.map(
        (row) => row.source,
      ),
    ).toEqual(["map"]);
    expect(await getClickSurfaces(fixture.businessId, 30)).toEqual([]);
    expect(
      (await getTrafficSources(fixture.otherBusinessId, 30))!.map(
        (row) => row.source,
      ),
    ).toEqual(["social"]);
  });

  it("returns nothing for a business that does not exist", async () => {
    const missing = "00000000-0000-4000-8000-0000000009ff";
    expect(await getTrafficSources(missing, 30)).toEqual([]);
    expect(await getClickSurfaces(missing, 30)).toEqual([]);
    expect(await getVisitorEstimate(missing, 30)).toEqual({
      visitors: 0,
      previous: 0,
    });
  });

  it("shows which area of the website contact buttons were used from", async () => {
    await record("call_click", { source: "business_website" });
    await record("email_click", { source: "business_website" });
    await record("external_click", { source: "offer" });
    await record("order_click", { source: "<script>alert(1)</script>" });
    // Page views and enquiries are not contact-button surfaces.
    await record("website_view", { source: "offer" });
    await record("enquiry", { source: "business_website" });

    expect(await getClickSurfaces(fixture.businessId, 30)).toEqual([
      { surface: "business_website", count: 2 },
      { surface: "offer", count: 1 },
      { surface: "other", count: 1 },
    ]);
  });

  it("estimates distinct visitors for this period and the one before", async () => {
    await record("website_view", { visitorHash: "a" });
    await record("website_view", { visitorHash: "a", hoursAgo: 5 });
    await record("website_view", { visitorHash: "b", hoursAgo: 30 });
    await record("website_view", { visitorHash: null, hoursAgo: 2 });
    await record("website_view", {
      visitorHash: "c",
      hoursAgo: 24 * 10,
    });
    await record("website_view", {
      visitorHash: "d",
      hoursAgo: 24 * 40,
    });
    await record("website_view", {
      visitorHash: "e",
      hoursAgo: 24 * 40,
    });
    // A click is not a visit.
    await record("call_click", { visitorHash: "z" });

    expect(await getVisitorEstimate(fixture.businessId, 7)).toEqual({
      visitors: 2,
      previous: 1,
    });
    expect(await getVisitorEstimate(fixture.businessId, 30)).toEqual({
      visitors: 3,
      previous: 2,
    });
  });

  it("agrees with the daily series and exports the same figures as CSV", async () => {
    await record("website_view", { visitorHash: "a" });
    await record("website_view", { visitorHash: "b" });
    await record("call_click", { source: "business_website" });
    await record("enquiry", { source: "business_website" });

    const [summary, daily] = await Promise.all([
      getBusinessAnalyticsSummary(fixture.businessId, 7),
      getBusinessDailyActivity(fixture.businessId, 7),
    ]);
    expect(summary.totalViews).toBe(2);
    expect(daily.reduce((sum, point) => sum + point.views, 0)).toBe(2);
    expect(buildWeekdayPattern(daily).reduce((s, r) => s + r.views, 0)).toBe(2);

    const csv = buildInsightsCsv(daily);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("date,views,contact_actions,enquiries");
    const totals = lines.slice(1).reduce(
      (sum, line) => {
        const [, views, contacts, enquiries] = line.split(",").map(Number);
        return {
          views: sum.views + views!,
          contacts: sum.contacts + contacts!,
          enquiries: sum.enquiries + enquiries!,
        };
      },
      { views: 0, contacts: 0, enquiries: 0 },
    );
    expect(totals).toEqual({ views: 2, contacts: 1, enquiries: 1 });
    expect(csv).not.toMatch(/visitor|hash/i);
  });
});
