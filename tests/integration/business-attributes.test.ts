import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessMembership,
  businessPublication,
  businessSite,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessAttributes } from "@/lib/database/schema/business-attributes";
import {
  getBusinessAttributes,
  saveBusinessAttributes,
  saveBusinessAttributesForUser,
} from "@/modules/businesses/attributes";
import {
  getPublishedBusinessBySlug,
  listPublishedBusinesses,
} from "@/modules/businesses/public";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000002101",
  outsiderId: "00000000-0000-4000-8000-000000002102",
  categoryId: "00000000-0000-4000-8000-000000002103",
  businessId: "00000000-0000-4000-8000-000000002104",
  siteId: "00000000-0000-4000-8000-000000002105",
  placeId: "00000000-0000-4000-8000-000000002106",
  locationId: "00000000-0000-4000-8000-000000002107",
} as const;

describeDatabase("business attributes", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Attributes Owner",
        email: "attributes.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.outsiderId,
        name: "Attributes Outsider",
        email: "attributes.outsider@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Attribute fixtures",
      slug: "attribute-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(place).values({
      id: fixture.placeId,
      canonicalName: "Fixture Attributes Place",
      slug: "fixture-attributes-place",
      placeType: "town",
      editorialSummary: "Fictional place used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Fixture Attributes Business",
      slug: "fixture-attributes-business",
      summary: "Fictional published business used only by automated tests.",
      description: "Fictional published business used only by automated tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      status: "published",
      createdByUserId: fixture.ownerId,
    });
    await database.insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: fixture.ownerId,
      role: "owner",
      permissions: permissionsForBusinessRole("owner"),
      status: "active",
    });
    await database.insert(businessLocation).values({
      id: fixture.locationId,
      businessId: fixture.businessId,
      placeId: fixture.placeId,
      locationType: "service_area",
      publicAddressVisibility: "service_area_only",
      isPrimary: true,
      status: "active",
    });
    await database.insert(businessSite).values({
      id: fixture.siteId,
      businessId: fixture.businessId,
      templateKey: "standard",
      platformPath: "/b/fixture-attributes-business",
      status: "published",
      publishedAt: new Date(),
    });
    await database.insert(businessPublication).values({
      businessId: fixture.businessId,
      businessSiteId: fixture.siteId,
      status: "published",
      publishedAt: new Date(),
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
    await database.delete(user).where(eq(user.id, fixture.outsiderId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("has no declared attributes until the owner saves this step", async () => {
    await expect(getBusinessAttributes(fixture.businessId)).resolves.toBeNull();
  });

  it("saves and upserts a business's declared attributes", async () => {
    await expect(
      saveBusinessAttributes({
        businessId: fixture.businessId,
        attributes: { stepFreeAccess: true, welshSpeaking: true },
      }),
    ).resolves.toMatchObject({ status: "saved" });

    await expect(
      getBusinessAttributes(fixture.businessId),
    ).resolves.toMatchObject({
      stepFreeAccess: true,
      welshSpeaking: true,
      hearingLoop: false,
    });

    // A second save fully replaces the previous values rather than merging.
    await expect(
      saveBusinessAttributes({
        businessId: fixture.businessId,
        attributes: { hearingLoop: true },
      }),
    ).resolves.toMatchObject({ status: "saved" });

    await expect(getBusinessAttributes(fixture.businessId)).resolves.toEqual({
      stepFreeAccess: false,
      accessibleToilet: false,
      hearingLoop: true,
      welshSpeaking: false,
      deliveryAvailable: false,
      collectionAvailable: false,
      emergencyAvailable: false,
      appointmentRequired: false,
    });

    const rows = await getDatabase()
      .select()
      .from(businessAttributes)
      .where(eq(businessAttributes.businessId, fixture.businessId));
    expect(rows).toHaveLength(1);
  });

  it("rejects an invalid attributes payload without writing anything", async () => {
    await expect(
      saveBusinessAttributes({
        businessId: fixture.businessId,
        attributes: { stepFreeAccess: "yes" },
      }),
    ).resolves.toEqual({ status: "invalid" });
    await expect(getBusinessAttributes(fixture.businessId)).resolves.toBeNull();
  });

  it("allows the business owner to save and denies an unrelated user", async () => {
    await expect(
      saveBusinessAttributesForUser({
        userId: fixture.ownerId,
        businessId: fixture.businessId,
        attributes: { stepFreeAccess: true },
      }),
    ).resolves.toMatchObject({ status: "saved" });

    await expect(
      saveBusinessAttributesForUser({
        userId: fixture.outsiderId,
        businessId: fixture.businessId,
        attributes: { stepFreeAccess: true },
      }),
    ).resolves.toEqual({ status: "forbidden" });
  });

  it("surfaces declared attributes on the public business detail page", async () => {
    const beforeSave = await getPublishedBusinessBySlug(
      "fixture-attributes-business",
    );
    expect(beforeSave.state).toBe("ready");
    if (beforeSave.state === "ready") {
      expect(beforeSave.business.attributes).toBeNull();
    }

    await saveBusinessAttributes({
      businessId: fixture.businessId,
      attributes: { hearingLoop: true, appointmentRequired: true },
    });

    const afterSave = await getPublishedBusinessBySlug(
      "fixture-attributes-business",
    );
    expect(afterSave.state).toBe("ready");
    if (afterSave.state === "ready") {
      expect(afterSave.business.attributes).toMatchObject({
        hearingLoop: true,
        appointmentRequired: true,
        stepFreeAccess: false,
      });
    }
  });

  it("filters the public directory by declared accessibility and Welsh-speaking attributes", async () => {
    await saveBusinessAttributes({
      businessId: fixture.businessId,
      attributes: { stepFreeAccess: true },
    });

    const accessible = await listPublishedBusinesses({
      query: "fixture attributes",
      accessibleOnly: true,
    });
    expect(accessible.state).toBe("ready");
    if (accessible.state === "ready") {
      expect(accessible.businesses.map((row) => row.id)).toContain(
        fixture.businessId,
      );
    }

    const welshSpeaking = await listPublishedBusinesses({
      query: "fixture attributes",
      welshSpeakingOnly: true,
    });
    expect(welshSpeaking.state).toBe("ready");
    if (welshSpeaking.state === "ready") {
      expect(welshSpeaking.businesses.map((row) => row.id)).not.toContain(
        fixture.businessId,
      );
    }
  });
});
