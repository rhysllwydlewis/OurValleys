import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import { businessLifecycle } from "@/lib/database/schema/business-operations";
import { getDetailsFreshness } from "@/modules/platform/details-freshness";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const categoryId = "00000000-0000-4000-8000-000000000a70";
const ids = {
  fresh: "00000000-0000-4000-8000-000000000a71",
  ageing: "00000000-0000-4000-8000-000000000a72",
  overdue: "00000000-0000-4000-8000-000000000a73",
  never: "00000000-0000-4000-8000-000000000a74",
  draft: "00000000-0000-4000-8000-000000000a75",
  suspended: "00000000-0000-4000-8000-000000000a76",
  demo: "00000000-0000-4000-8000-000000000a77",
} as const;

const now = new Date("2026-11-16T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describeDatabase("details freshness report", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: categoryId,
      name: "Fixture freshness services",
      slug: "fixture-freshness-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      Object.entries(ids).map(([key, id]) => ({
        id,
        tradingName: `Fixture freshness ${key}`,
        slug: `fixture-freshness-${key}`,
        summary: "A fictional business used only by freshness tests.",
        description: "Fictional description.",
        primaryCategoryId: categoryId,
        businessType: "limited_company" as const,
        status: key === "draft" ? ("draft" as const) : ("published" as const),
        suspendedAt: key === "suspended" ? daysAgo(1) : null,
        isDemo: key === "demo",
      })),
    );
    // Every listing except "fresh" and "never" would be listed if it were
    // live, so the excluded ones prove the live-directory filter.
    const lapsed = {
      lastConfirmedAt: daysAgo(400),
      nextConfirmationDueAt: daysAgo(35),
      staleAt: daysAgo(30),
    };
    await database.insert(businessLifecycle).values([
      {
        businessId: ids.fresh,
        lastConfirmedAt: daysAgo(20),
        nextConfirmationDueAt: daysAgo(-345),
      },
      {
        businessId: ids.ageing,
        lastConfirmedAt: daysAgo(250),
        nextConfirmationDueAt: daysAgo(-115),
      },
      { businessId: ids.overdue, ...lapsed },
      { businessId: ids.draft, ...lapsed },
      { businessId: ids.suspended, ...lapsed },
      { businessId: ids.demo, ...lapsed },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    const all = Object.values(ids);
    await database
      .delete(businessLifecycle)
      .where(inArray(businessLifecycle.businessId, all));
    await database.delete(business).where(inArray(business.id, all));
    await database.delete(category).where(eq(category.id, categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("groups live listings and leaves out draft, suspended and demo ones", async () => {
    const report = await getDetailsFreshness(now);
    const fixtureIds = new Set<string>(Object.values(ids));
    const mine = report.rows.filter((row) => fixtureIds.has(row.id));

    expect(mine.map((row) => [row.id, row.group])).toEqual([
      [ids.overdue, "overdue"],
      [ids.ageing, "ageing"],
      [ids.never, "never"],
    ]);
    const overdue = mine[0]!;
    expect(overdue.lastConfirmedAt?.getTime()).toBe(daysAgo(400).getTime());
    // Stale 30 days ago with a 60-day grace period.
    expect(overdue.unpublishesAt?.getTime()).toBe(daysAgo(-30).getTime());
    expect(mine[2]!.lastConfirmedAt).toBeNull();
    // The fresh listing is counted but not listed.
    expect(report.fresh).toBeGreaterThanOrEqual(1);
    expect(report.total).toBe(report.fresh + report.rows.length);
  });
});
