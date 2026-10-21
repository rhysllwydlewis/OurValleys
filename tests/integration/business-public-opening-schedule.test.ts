import { eq, inArray } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  category,
  openingHoursException,
  openingHoursRule,
} from "@/lib/database/schema/business";
import {
  addDaysToDateString,
  londonDateString,
} from "@/modules/businesses/opening-hours-exceptions";
import { openingStatus, resolveDay } from "@/modules/businesses/opening-status";
import { getPublicOpeningSchedule } from "@/modules/businesses/public-opening-schedule";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const id = (suffix: string) => `00000000-0000-4000-8000-0000000019${suffix}`;
const fixture = {
  categoryId: id("a1"),
  businessA: id("a2"),
  businessB: id("a3"),
  businessNoLocation: id("a4"),
  locationA: id("a5"),
  locationB: id("a6"),
  placeId: "00000000-0000-4000-8000-000000000301",
} as const;

const now = new Date();
const today = londonDateString(now);
const inDays = (days: number) => addDaysToDateString(today, days);

describeDatabase("public opening schedule", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture live hours services",
      slug: "fixture-live-hours-services",
      description: "Fictional category used only by automated tests.",
    });
    for (const [businessId, slug] of [
      [fixture.businessA, "live-hours-a"],
      [fixture.businessB, "live-hours-b"],
      [fixture.businessNoLocation, "live-hours-none"],
    ] as const) {
      await database.insert(business).values({
        id: businessId,
        tradingName: slug,
        slug,
        summary: "A fictional business used only by live-hours tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "sole_trader",
        status: "published",
      });
    }
    await database.insert(businessLocation).values([
      {
        id: fixture.locationA,
        businessId: fixture.businessA,
        placeId: fixture.placeId,
        locationType: "service_area",
        isPrimary: true,
      },
      {
        id: fixture.locationB,
        businessId: fixture.businessB,
        placeId: fixture.placeId,
        locationType: "service_area",
        isPrimary: true,
      },
    ]);
    await database.insert(openingHoursRule).values([
      ...[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        businessLocationId: fixture.locationA,
        dayOfWeek,
        isClosed: dayOfWeek === 0,
        opensAt: dayOfWeek === 0 ? null : "09:00",
        closesAt: dayOfWeek === 0 ? null : "17:00",
      })),
      // Business B opens at different hours; it must never leak into A.
      ...[1, 2].map((dayOfWeek) => ({
        businessLocationId: fixture.locationB,
        dayOfWeek,
        isClosed: false,
        opensAt: "05:00",
        closesAt: "06:00",
      })),
    ]);
    await database.insert(openingHoursException).values([
      {
        businessLocationId: fixture.locationA,
        date: inDays(-3),
        isClosed: true,
        note: "Past closure",
      },
      {
        businessLocationId: fixture.locationA,
        date: inDays(2),
        isClosed: true,
        note: "Staff training",
      },
      {
        businessLocationId: fixture.locationA,
        date: inDays(5),
        isClosed: false,
        opensAt: "11:00",
        closesAt: "13:00",
      },
      {
        businessLocationId: fixture.locationA,
        date: inDays(200),
        isClosed: true,
        note: "Far future",
      },
      {
        businessLocationId: fixture.locationB,
        date: inDays(2),
        isClosed: true,
        note: "Other business closure",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    const ids = [
      fixture.businessA,
      fixture.businessB,
      fixture.businessNoLocation,
    ];
    await database.delete(business).where(inArray(business.id, ids));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  it("returns the weekly rules and only the upcoming special days", async () => {
    const schedule = await getPublicOpeningSchedule(fixture.businessA, now);
    expect(schedule).not.toBeNull();
    expect(schedule!.weekly[1]).toEqual({ opens: "09:00", closes: "17:00" });
    expect(schedule!.weekly[0]).toEqual({ opens: null, closes: null });
    expect(schedule!.exceptions.map((entry) => entry.date)).toEqual([
      inDays(2),
      inDays(5),
    ]);
  });

  it("applies a special day over the weekly rule", async () => {
    const schedule = (await getPublicOpeningSchedule(fixture.businessA, now))!;
    expect(resolveDay(schedule, inDays(2))).toMatchObject({
      opens: null,
      special: true,
      note: "Staff training",
    });
    expect(resolveDay(schedule, inDays(5))).toMatchObject({
      opens: "11:00",
      closes: "13:00",
    });
    expect(openingStatus(schedule, now).kind).not.toBe("unknown");
  });

  it("never mixes one business's hours or notes into another's", async () => {
    const a = (await getPublicOpeningSchedule(fixture.businessA, now))!;
    const b = (await getPublicOpeningSchedule(fixture.businessB, now))!;
    expect(JSON.stringify(a)).not.toContain("Other business closure");
    expect(JSON.stringify(a)).not.toContain("05:00");
    expect(JSON.stringify(b)).not.toContain("Staff training");
    expect(b.weekly[1]).toEqual({ opens: "05:00", closes: "06:00" });
    expect(b.weekly[3]).toEqual({ opens: null, closes: null });
  });

  it("returns null for a business with no location or an unknown id", async () => {
    expect(
      await getPublicOpeningSchedule(fixture.businessNoLocation, now),
    ).toBeNull();
    expect(await getPublicOpeningSchedule(id("ff"), now)).toBeNull();
  });
});
