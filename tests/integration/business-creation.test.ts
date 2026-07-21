import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import {
  createBusinessDraft,
  findSimilarPublishedBusinesses,
  maxOwnedBusinesses,
} from "@/modules/businesses/creation";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000901",
  categoryId: "00000000-0000-4000-8000-000000000902",
  placeId: "00000000-0000-4000-8000-000000000903",
  inactiveCategoryId: "00000000-0000-4000-8000-000000000904",
  publishedBusinessId: "00000000-0000-4000-8000-000000000905",
} as const;

async function deleteCreatedBusinesses() {
  const database = getDatabase();
  const created = await database
    .select({ id: business.id })
    .from(business)
    .where(eq(business.createdByUserId, fixture.userId));
  const ids = created.map((row) => row.id);
  if (ids.length > 0) {
    await database
      .delete(businessOnboardingDraft)
      .where(inArray(businessOnboardingDraft.businessId, ids));
    await database
      .delete(businessMembership)
      .where(inArray(businessMembership.businessId, ids));
    await database.delete(business).where(inArray(business.id, ids));
  }
}

describeDatabase("business creation", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.userId,
      name: "Creation Fixture",
      email: "creation.fixture@example.test",
      emailVerified: true,
    });
    await database.insert(category).values([
      {
        id: fixture.categoryId,
        name: "Fixture creation services",
        slug: "fixture-creation-services",
        description: "Fictional category used only by automated tests.",
      },
      {
        id: fixture.inactiveCategoryId,
        name: "Fixture retired services",
        slug: "fixture-retired-services",
        description: "Fictional retired category used only by tests.",
        status: "retired",
      },
    ]);
    await database.insert(place).values({
      id: fixture.placeId,
      canonicalName: "Fixture Tonypandy",
      slug: "fixture-tonypandy",
      placeType: "town",
      editorialSummary: "Fictional place used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.publishedBusinessId,
      tradingName: "Tiglers Fish and Chips",
      slug: "tiglers-fish-and-chips",
      summary: "Fictional published fixture.",
      description: "Fictional published fixture business.",
      primaryCategoryId: fixture.categoryId,
      businessType: "premises",
      status: "published",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await deleteCreatedBusinesses();
    await database
      .delete(business)
      .where(eq(business.id, fixture.publishedBusinessId));
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database
      .delete(category)
      .where(
        inArray(category.id, [fixture.categoryId, fixture.inactiveCategoryId]),
      );
    await database.delete(user).where(eq(user.id, fixture.userId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("creates a draft business with owner membership, seeded draft and clean slug", async () => {
    const result = await createBusinessDraft({
      userId: fixture.userId,
      creation: {
        tradingName: "Tŷ Coffi Cwtch",
        primaryCategoryId: fixture.categoryId,
        placeId: fixture.placeId,
        businessType: "premises",
      },
    });

    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.slug).toBe("ty-coffi-cwtch");

    const database = getDatabase();
    const [createdBusiness] = await database
      .select()
      .from(business)
      .where(eq(business.id, result.businessId));
    expect(createdBusiness?.status).toBe("draft");
    expect(createdBusiness?.createdByUserId).toBe(fixture.userId);

    const [membership] = await database
      .select()
      .from(businessMembership)
      .where(eq(businessMembership.businessId, result.businessId));
    expect(membership?.userId).toBe(fixture.userId);
    expect(membership?.role).toBe("owner");
    expect(membership?.status).toBe("active");

    const [draft] = await database
      .select()
      .from(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, result.businessId));
    expect(draft?.location).toMatchObject({
      placeId: fixture.placeId,
      locationType: "premises",
    });
  });

  it("appends the place slug when the business name is already taken", async () => {
    const result = await createBusinessDraft({
      userId: fixture.userId,
      creation: {
        tradingName: "Tiglers Fish & Chips",
        primaryCategoryId: fixture.categoryId,
        placeId: fixture.placeId,
        businessType: "premises",
      },
    });

    expect(result.status).toBe("created");
    if (result.status !== "created") return;
    expect(result.slug).toBe("tiglers-fish-and-chips-fixture-tonypandy");
  });

  it("rejects a retired category", async () => {
    const result = await createBusinessDraft({
      userId: fixture.userId,
      creation: {
        tradingName: "Fixture Denied Business",
        primaryCategoryId: fixture.inactiveCategoryId,
        placeId: fixture.placeId,
        businessType: "service_area",
      },
    });

    expect(result.status).toBe("invalid");
  });

  it("enforces the owned-business limit", async () => {
    for (let index = 0; index < maxOwnedBusinesses; index += 1) {
      const result = await createBusinessDraft({
        userId: fixture.userId,
        creation: {
          tradingName: `Fixture Owned Business ${index + 1}`,
          primaryCategoryId: fixture.categoryId,
          placeId: fixture.placeId,
          businessType: "service_area",
        },
      });
      expect(result.status).toBe("created");
    }

    const blocked = await createBusinessDraft({
      userId: fixture.userId,
      creation: {
        tradingName: "Fixture One Business Too Many",
        primaryCategoryId: fixture.categoryId,
        placeId: fixture.placeId,
        businessType: "service_area",
      },
    });

    expect(blocked.status).toBe("limit");
  });

  it("surfaces similar published businesses for the duplicate check", async () => {
    const matches = await findSimilarPublishedBusinesses("tiglers fish");
    expect(matches.map((match) => match.slug)).toContain(
      "tiglers-fish-and-chips",
    );
  });
});
