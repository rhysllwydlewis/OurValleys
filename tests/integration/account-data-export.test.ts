import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { businessReview } from "@/lib/database/schema/business-reviews";
import { contentReport } from "@/lib/database/schema/moderation";
import {
  savedBusiness,
  savedEvent,
  savedPlace,
} from "@/lib/database/schema/saved-discovery";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";
import { buildUserDataExport } from "@/modules/identity/data-export";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000930",
  categoryId: "00000000-0000-4000-8000-000000000931",
  businessId: "00000000-0000-4000-8000-000000000932",
  placeId: "00000000-0000-4000-8000-000000000933",
  eventId: "00000000-0000-4000-8000-000000000934",
} as const;

describeDatabase("account data export", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.userId,
      name: "Fixture Resident",
      email: "resident@data-export-fixture.test",
      emailVerified: true,
      marketingOptIn: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture export services",
      slug: "fixture-export-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Data Export Fixture Studio",
      slug: "data-export-fixture-studio",
      summary: "A fictional business used only by data-export tests.",
      description: "Fictional description.",
      primaryCategoryId: fixture.categoryId,
      businessType: "limited_company",
      createdByUserId: fixture.userId,
    });
    await database.insert(place).values({
      id: fixture.placeId,
      canonicalName: "Fixture Export Valley",
      slug: "fixture-export-valley",
      placeType: "town",
      editorialSummary: "A fictional place used only by data-export tests.",
    });
    await database.insert(businessEvent).values({
      id: fixture.eventId,
      businessId: fixture.businessId,
      title: "Fixture Studio Open Day",
      description: "A fictional event used only by data-export tests.",
      startsAt: new Date("2099-01-01T10:00:00Z"),
      status: "active",
    });
    await database.insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: fixture.userId,
      role: "owner",
      permissions: permissionsForBusinessRole("owner"),
      status: "active",
    });
    await database.insert(businessReview).values({
      businessId: fixture.businessId,
      userId: fixture.userId,
      rating: 4,
      body: "Fictional review used only by data-export tests.",
    });
    await database
      .insert(savedBusiness)
      .values({ userId: fixture.userId, businessId: fixture.businessId });
    await database
      .insert(savedEvent)
      .values({ userId: fixture.userId, eventId: fixture.eventId });
    await database
      .insert(savedPlace)
      .values({ userId: fixture.userId, placeId: fixture.placeId });
    await database.insert(contentReport).values({
      businessId: fixture.businessId,
      reporterUserId: fixture.userId,
      reason: "other",
      details: "Fictional report used only by data-export tests.",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(contentReport)
      .where(eq(contentReport.businessId, fixture.businessId));
    await database
      .delete(savedPlace)
      .where(eq(savedPlace.userId, fixture.userId));
    await database
      .delete(savedEvent)
      .where(eq(savedEvent.userId, fixture.userId));
    await database
      .delete(savedBusiness)
      .where(eq(savedBusiness.userId, fixture.userId));
    await database
      .delete(businessReview)
      .where(eq(businessReview.userId, fixture.userId));
    await database
      .delete(businessMembership)
      .where(eq(businessMembership.userId, fixture.userId));
    await database
      .delete(businessEvent)
      .where(eq(businessEvent.id, fixture.eventId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.userId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("returns null for a user that does not exist", async () => {
    const result = await buildUserDataExport(
      "00000000-0000-4000-8000-000000000999",
    );
    expect(result).toBeNull();
  });

  it("returns null for a malformed user id", async () => {
    const result = await buildUserDataExport("not-a-uuid");
    expect(result).toBeNull();
  });

  it("assembles the full personal data export for a resident", async () => {
    const result = await buildUserDataExport(fixture.userId);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.profile.email).toBe("resident@data-export-fixture.test");
    expect(result.profile.marketingOptIn).toBe(true);

    expect(result.savedBusinesses).toHaveLength(1);
    expect(result.savedBusinesses[0]?.businessId).toBe(fixture.businessId);

    expect(result.savedEvents).toHaveLength(1);
    expect(result.savedEvents[0]?.eventId).toBe(fixture.eventId);

    expect(result.savedPlaces).toHaveLength(1);
    expect(result.savedPlaces[0]?.placeId).toBe(fixture.placeId);

    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0]?.rating).toBe(4);

    expect(result.businessMemberships).toHaveLength(1);
    expect(result.businessMemberships[0]?.role).toBe("owner");

    expect(result.businessesCreated).toHaveLength(1);
    expect(result.businessesCreated[0]?.businessId).toBe(fixture.businessId);

    expect(result.contentReportsFiled).toHaveLength(1);
    expect(result.contentReportsFiled[0]?.targetType).toBe("business");
  });
});
