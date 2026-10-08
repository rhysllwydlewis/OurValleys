import { asc, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMedia,
  category,
} from "@/lib/database/schema/business";
import { businessActivityEvent } from "@/lib/database/schema/business-operations";
import {
  getBusinessAnalyticsSummary,
  getBusinessDailyActivity,
} from "@/modules/businesses/analytics";
import { setBusinessGalleryOrder } from "@/modules/businesses/media";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000b01",
  categoryId: "00000000-0000-4000-8000-000000000b02",
  businessId: "00000000-0000-4000-8000-000000000b03",
  otherBusinessId: "00000000-0000-4000-8000-000000000b04",
  galleryA: "00000000-0000-4000-8000-000000000b11",
  galleryB: "00000000-0000-4000-8000-000000000b12",
  galleryC: "00000000-0000-4000-8000-000000000b13",
  foreign: "00000000-0000-4000-8000-000000000b14",
} as const;

function galleryRow(id: string, businessId: string, sortOrder: number) {
  return {
    id,
    businessId,
    role: "gallery",
    storageKey: `fixture/${id}.webp`,
    altText: `Fixture ${id.slice(-2)}`,
    contentType: "image/webp",
    byteSize: 1000,
    sortOrder,
  };
}

describeDatabase("gallery order and daily activity", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.userId,
      name: "Gallery Fixture",
      email: "gallery.order.fixture@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture gallery category",
      slug: "fixture-gallery-category",
      description: "Fictional category used only by automated tests.",
    });
    for (const [id, slug] of [
      [fixture.businessId, "fixture-gallery-order"],
      [fixture.otherBusinessId, "fixture-gallery-other"],
    ] as const) {
      await database.insert(business).values({
        id,
        tradingName: `Fixture ${slug}`,
        slug,
        summary: "A fictional business used only by automated tests.",
        description: "This business exists only during automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        createdByUserId: fixture.userId,
      });
    }
    await database
      .insert(businessMedia)
      .values([
        galleryRow(fixture.galleryA, fixture.businessId, 0),
        galleryRow(fixture.galleryB, fixture.businessId, 1),
        galleryRow(fixture.galleryC, fixture.businessId, 2),
        galleryRow(fixture.foreign, fixture.otherBusinessId, 0),
      ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessActivityEvent)
      .where(eq(businessActivityEvent.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.userId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function currentOrder() {
    const rows = await getDatabase()
      .select({ id: businessMedia.id })
      .from(businessMedia)
      .where(eq(businessMedia.businessId, fixture.businessId))
      .orderBy(asc(businessMedia.sortOrder));
    return rows.map((row) => row.id);
  }

  it("applies a complete reordering and reports an unchanged one", async () => {
    await expect(
      setBusinessGalleryOrder({
        businessId: fixture.businessId,
        orderedIds: [fixture.galleryC, fixture.galleryA, fixture.galleryB],
      }),
    ).resolves.toEqual({ status: "reordered" });
    await expect(currentOrder()).resolves.toEqual([
      fixture.galleryC,
      fixture.galleryA,
      fixture.galleryB,
    ]);

    await expect(
      setBusinessGalleryOrder({
        businessId: fixture.businessId,
        orderedIds: [fixture.galleryC, fixture.galleryA, fixture.galleryB],
      }),
    ).resolves.toEqual({ status: "unchanged" });
  });

  it("rejects partial, duplicated and foreign orderings without changing anything", async () => {
    const original = await currentOrder();
    for (const orderedIds of [
      [fixture.galleryA, fixture.galleryB],
      [fixture.galleryA, fixture.galleryA, fixture.galleryB],
      [fixture.galleryA, fixture.galleryB, fixture.foreign],
    ]) {
      await expect(
        setBusinessGalleryOrder({ businessId: fixture.businessId, orderedIds }),
      ).resolves.toEqual({ status: "stale" });
    }
    await expect(currentOrder()).resolves.toEqual(original);

    // The other tenant's image was never touched.
    const [foreignRow] = await getDatabase()
      .select({ sortOrder: businessMedia.sortOrder })
      .from(businessMedia)
      .where(eq(businessMedia.id, fixture.foreign));
    expect(foreignRow?.sortOrder).toBe(0);
  });

  it("ignores removed images when validating the order", async () => {
    await getDatabase()
      .update(businessMedia)
      .set({ status: "removed" })
      .where(eq(businessMedia.id, fixture.galleryB));
    await expect(
      setBusinessGalleryOrder({
        businessId: fixture.businessId,
        orderedIds: [fixture.galleryA, fixture.galleryB, fixture.galleryC],
      }),
    ).resolves.toEqual({ status: "stale" });
    await expect(
      setBusinessGalleryOrder({
        businessId: fixture.businessId,
        orderedIds: [fixture.galleryC, fixture.galleryA],
      }),
    ).resolves.toEqual({ status: "reordered" });
  });

  it("returns a gap-free daily series scoped to the business", async () => {
    const database = getDatabase();
    await database.insert(businessActivityEvent).values([
      { businessId: fixture.businessId, eventType: "website_view" },
      { businessId: fixture.businessId, eventType: "website_view" },
      { businessId: fixture.businessId, eventType: "call_click" },
      { businessId: fixture.businessId, eventType: "enquiry" },
      { businessId: fixture.otherBusinessId, eventType: "website_view" },
    ]);
    const series = await getBusinessDailyActivity(fixture.businessId, 7);
    // 7 x 24h touches 8 London calendar days; the first is a part day.
    expect(series).toHaveLength(8);
    expect(series[0]!.partial).toBe(true);
    const today = series[series.length - 1]!;
    expect(today).toMatchObject({ views: 2, contactActions: 1, enquiries: 1 });
    expect(series.slice(0, -1).every((point) => point.views === 0)).toBe(true);
    await database
      .delete(businessActivityEvent)
      .where(eq(businessActivityEvent.businessId, fixture.otherBusinessId));
  });

  it("adds up to the headline totals even for events near the window edge", async () => {
    const hour = 60 * 60 * 1000;
    const now = Date.now();
    await getDatabase()
      .insert(businessActivityEvent)
      .values([
        // Inside the rolling 30 x 24h window but on the London day before a
        // 30-calendar-day window would start.
        {
          businessId: fixture.businessId,
          eventType: "website_view",
          occurredAt: new Date(now - (29 * 24 + 20) * hour),
        },
        // Just outside the rolling window.
        {
          businessId: fixture.businessId,
          eventType: "website_view",
          occurredAt: new Date(now - (30 * 24 + 2) * hour),
        },
        {
          businessId: fixture.businessId,
          eventType: "call_click",
          occurredAt: new Date(now - 2 * hour),
        },
        {
          businessId: fixture.businessId,
          eventType: "website_view",
          occurredAt: new Date(now - hour),
        },
      ]);

    const [summary, series] = await Promise.all([
      getBusinessAnalyticsSummary(fixture.businessId, 30),
      getBusinessDailyActivity(fixture.businessId, 30),
    ]);
    const sum = (key: "views" | "contactActions" | "enquiries") =>
      series.reduce((total, point) => total + point[key], 0);

    expect(summary.totalViews).toBe(2);
    expect(sum("views")).toBe(summary.totalViews);
    expect(sum("contactActions")).toBe(summary.contactActions);
    expect(sum("enquiries")).toBe(summary.enquiries);
    expect(series[0]!.partial).toBe(true);
    expect(series.slice(1).every((point) => !point.partial)).toBe(true);
  });
});
