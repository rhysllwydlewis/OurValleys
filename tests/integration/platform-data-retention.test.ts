import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { session, user, verification } from "@/lib/database/schema/auth";
import {
  business,
  category,
  openingHoursException,
} from "@/lib/database/schema/business";
import { businessActivityEvent } from "@/lib/database/schema/business-operations";
import { purgePlatformData } from "@/modules/platform/data-retention";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000961",
  categoryId: "00000000-0000-4000-8000-000000000962",
  businessId: "00000000-0000-4000-8000-000000000963",
} as const;

const now = new Date("2026-09-28T12:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describeDatabase("platform data retention", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.userId,
      name: "Retention Fixture",
      email: "retention-fixture@platform-retention.test",
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture platform retention services",
      slug: "fixture-platform-retention-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Platform Retention Fixture Studio",
      slug: "platform-retention-fixture-studio",
      summary: "A fictional business used only by retention tests.",
      description: "Fictional description.",
      primaryCategoryId: fixture.categoryId,
      businessType: "limited_company",
      status: "published",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessActivityEvent)
      .where(eq(businessActivityEvent.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database
      .delete(verification)
      .where(
        inArray(verification.identifier, [
          "retention-old@platform-retention.test",
          "retention-recent@platform-retention.test",
          "retention-live@platform-retention.test",
        ]),
      );
    await database.delete(user).where(eq(user.id, fixture.userId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("removes long-expired sessions but keeps live and recently expired ones", async () => {
    const database = getDatabase();
    await database.insert(session).values([
      {
        userId: fixture.userId,
        token: "retention-token-old",
        expiresAt: daysAgo(45),
      },
      {
        userId: fixture.userId,
        token: "retention-token-recent",
        expiresAt: daysAgo(2),
      },
      {
        userId: fixture.userId,
        token: "retention-token-live",
        expiresAt: new Date(now.getTime() + 86_400_000),
      },
    ]);

    const result = await purgePlatformData(now);
    expect(result.sessions).toBeGreaterThanOrEqual(1);

    const remaining = await database
      .select({ token: session.token })
      .from(session)
      .where(eq(session.userId, fixture.userId));
    expect(remaining.map((row) => row.token).sort()).toEqual([
      "retention-token-live",
      "retention-token-recent",
    ]);
  });

  it("removes long-expired verification tokens but keeps recent and live ones", async () => {
    const database = getDatabase();
    await database.insert(verification).values([
      {
        identifier: "retention-old@platform-retention.test",
        value: "token-old",
        expiresAt: daysAgo(20),
      },
      {
        identifier: "retention-recent@platform-retention.test",
        value: "token-recent",
        expiresAt: daysAgo(1),
      },
      {
        identifier: "retention-live@platform-retention.test",
        value: "token-live",
        expiresAt: new Date(now.getTime() + 3_600_000),
      },
    ]);

    await purgePlatformData(now);

    const remaining = await database
      .select({ identifier: verification.identifier })
      .from(verification)
      .where(
        inArray(verification.identifier, [
          "retention-old@platform-retention.test",
          "retention-recent@platform-retention.test",
          "retention-live@platform-retention.test",
        ]),
      );
    expect(remaining.map((row) => row.identifier).sort()).toEqual([
      "retention-live@platform-retention.test",
      "retention-recent@platform-retention.test",
    ]);
  });

  it("removes activity events outside the retention window only", async () => {
    const database = getDatabase();
    await database.insert(businessActivityEvent).values([
      {
        businessId: fixture.businessId,
        eventType: "website_view",
        occurredAt: daysAgo(30 * 30),
      },
      {
        businessId: fixture.businessId,
        eventType: "website_view",
        occurredAt: daysAgo(30 * 12),
      },
      {
        businessId: fixture.businessId,
        eventType: "call_click",
        occurredAt: daysAgo(1),
      },
    ]);

    const result = await purgePlatformData(now);
    expect(result.activityEvents).toBeGreaterThanOrEqual(1);

    const remaining = await database
      .select({ id: businessActivityEvent.id })
      .from(businessActivityEvent)
      .where(eq(businessActivityEvent.businessId, fixture.businessId));
    expect(remaining).toHaveLength(2);
  });

  it("removes special opening days a month after their date and keeps the rest", async () => {
    const database = getDatabase();
    // Seeded fictional location shared by the other integration fixtures.
    const locationId = "00000000-0000-4000-8000-000000000701";
    await database.insert(openingHoursException).values([
      { businessLocationId: locationId, date: "2026-08-01", isClosed: true },
      { businessLocationId: locationId, date: "2026-09-10", isClosed: true },
      { businessLocationId: locationId, date: "2026-12-25", isClosed: true },
    ]);
    try {
      const result = await purgePlatformData(now);
      expect(result.openingExceptions).toBe(1);
      expect(result.failures).toEqual([]);
      const remaining = await database
        .select({ date: openingHoursException.date })
        .from(openingHoursException)
        .where(eq(openingHoursException.businessLocationId, locationId));
      expect(remaining.map((row) => row.date).sort()).toEqual([
        "2026-09-10",
        "2026-12-25",
      ]);
    } finally {
      await database
        .delete(openingHoursException)
        .where(eq(openingHoursException.businessLocationId, locationId));
    }
  });

  it("is a no-op when nothing is due", async () => {
    const first = await purgePlatformData(now);
    const second = await purgePlatformData(now);
    expect(second).toEqual({
      sessions: 0,
      verifications: 0,
      activityEvents: 0,
      openingExceptions: 0,
      failures: [],
    });
    expect(first.sessions).toBeGreaterThanOrEqual(0);
  });
});
