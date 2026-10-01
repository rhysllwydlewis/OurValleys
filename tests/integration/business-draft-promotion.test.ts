import { and, eq } from "drizzle-orm";
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
  openingHoursException,
  openingHoursRule,
  service,
} from "@/lib/database/schema/business";
import { businessTermsAcceptance } from "@/lib/database/schema/business-governance";
import { businessLifecycle } from "@/lib/database/schema/business-operations";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import {
  acceptBusinessTerms,
  configureAutomaticPublication,
  runLifecycleAutomation,
} from "@/modules/businesses/lifecycle-automation";
import { savePersistedBusinessOnboardingDraft } from "@/modules/businesses/onboarding-draft-repository";
import {
  addDaysToDateString,
  londonDateString,
} from "@/modules/businesses/opening-hours-exceptions";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import {
  approveBusinessPublication,
  rejectBusinessPublication,
  submitBusinessForReview,
} from "@/modules/businesses/publication";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000921",
  businessId: "00000000-0000-4000-8000-000000000922",
  ownerUserId: "00000000-0000-4000-8000-000000000923",
  adminUserId: "00000000-0000-4000-8000-000000000924",
  membershipId: "00000000-0000-4000-8000-000000000925",
  // Seeded fictional place used by the other integration fixtures.
  placeId: "00000000-0000-4000-8000-000000000301",
  slug: "draft-promotion-fixture",
} as const;

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function validDraft(overrides: { openingTime?: string } = {}) {
  const today = londonDateString(new Date());
  return {
    profile: {
      tradingName: "Promotion Fixture Studio",
      summary: "A fictional studio used by automated promotion tests.",
      publicPhone: "01443 000111",
      publicEmail: "hello@promotion-fixture.test",
    },
    location: {
      placeId: fixture.placeId,
      locationType: "premises",
      publicAddressVisibility: "locality_only",
      publicAddressLineOne: null,
      publicLocality: "Pontypridd",
      publicPostcode: null,
      privateAddressLineOne: "1 Private Street",
      privatePostcode: "CF37 1AA",
    },
    services: [
      {
        name: "Fixture haircut",
        description: "A fictional cut.",
        priceGuidance: "From £15",
      },
      { name: "Fixture colour", description: null, priceGuidance: null },
    ],
    hours: weekdays.map((day) =>
      day === "sunday"
        ? { day, closed: true, opensAt: null, closesAt: null }
        : {
            day,
            closed: false,
            opensAt: overrides.openingTime ?? "09:00",
            closesAt: "17:00",
          },
    ),
    exceptionalHours: [
      {
        date: addDaysToDateString(today, 3),
        closed: true,
        opensAt: null,
        closesAt: null,
        note: "Bank holiday",
      },
      {
        date: addDaysToDateString(today, 5),
        closed: false,
        opensAt: "10:00",
        closesAt: "13:00",
        note: null,
      },
      {
        date: addDaysToDateString(today, -2),
        closed: true,
        opensAt: null,
        closesAt: null,
        note: "Already past",
      },
    ],
  };
}

async function insertPendingBusiness(draft = validDraft()) {
  const database = getDatabase();
  await database.insert(business).values({
    id: fixture.businessId,
    tradingName: "Original name",
    slug: fixture.slug,
    summary: "",
    description: "",
    primaryCategoryId: fixture.categoryId,
    businessType: "sole_trader",
    status: "draft",
    claimStatus: "claimed",
  });
  await database.insert(businessMembership).values({
    id: fixture.membershipId,
    businessId: fixture.businessId,
    userId: fixture.ownerUserId,
    role: "owner",
    permissions: ["business.view", "business.edit_profile", "business.publish"],
    status: "active",
    acceptedAt: new Date(),
  });
  await database
    .insert(businessOnboardingDraft)
    .values({ businessId: fixture.businessId, ...draft });
}

async function submitAndApprove() {
  const submitted = await submitBusinessForReview({
    userId: fixture.ownerUserId,
    businessId: fixture.businessId,
  });
  expect(submitted.status).toBe("submitted");
  return approveBusinessPublication({
    adminUserId: fixture.adminUserId,
    businessId: fixture.businessId,
  });
}

async function primaryLocation() {
  const [row] = await getDatabase()
    .select()
    .from(businessLocation)
    .where(eq(businessLocation.businessId, fixture.businessId));
  return row;
}

describeDatabase("onboarding draft promotion on publication", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture promotion services",
      slug: "fixture-promotion-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(user).values([
      {
        id: fixture.ownerUserId,
        name: "Fixture Owner",
        email: "owner@promotion-fixture.test",
        emailVerified: true,
      },
      {
        id: fixture.adminUserId,
        name: "Fixture Admin",
        email: "admin@promotion-fixture.test",
        emailVerified: true,
        role: "admin",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const table of [
      businessOnboardingDraft,
      businessPublication,
      businessSite,
      businessLifecycle,
      businessTermsAcceptance,
      businessMembership,
    ]) {
      await database
        .delete(table)
        .where(eq(table.businessId, fixture.businessId));
    }
    // Locations cascade to hours and exceptions; services cascade from business.
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    for (const userId of [fixture.ownerUserId, fixture.adminUserId]) {
      await database.delete(user).where(eq(user.id, userId));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("writes the approved draft into the canonical record so the public page renders it", async () => {
    await insertPendingBusiness();
    expect(await submitAndApprove()).toEqual({ status: "approved" });

    const database = getDatabase();
    const [row] = await database
      .select()
      .from(business)
      .where(eq(business.id, fixture.businessId));
    expect(row).toMatchObject({
      tradingName: "Promotion Fixture Studio",
      summary: "A fictional studio used by automated promotion tests.",
      // Seeded from the summary because the generated site prefers it.
      description: "A fictional studio used by automated promotion tests.",
      publicPhone: "01443 000111",
      publicEmail: "hello@promotion-fixture.test",
      status: "published",
    });

    const location = await primaryLocation();
    expect(location).toMatchObject({
      placeId: fixture.placeId,
      isPrimary: true,
      status: "active",
      publicAddressVisibility: "locality_only",
      privateAddressLineOne: "1 Private Street",
    });

    const rules = await database
      .select()
      .from(openingHoursRule)
      .where(eq(openingHoursRule.businessLocationId, location!.id));
    expect(rules).toHaveLength(7);
    const byDay = new Map(rules.map((rule) => [rule.dayOfWeek, rule]));
    expect(byDay.get(0)).toMatchObject({ isClosed: true, opensAt: null });
    expect(byDay.get(1)).toMatchObject({
      isClosed: false,
      opensAt: "09:00",
      closesAt: "17:00",
    });

    const exceptions = await database
      .select()
      .from(openingHoursException)
      .where(eq(openingHoursException.businessLocationId, location!.id));
    expect(exceptions.map((item) => item.note).sort()).toEqual([
      "Bank holiday",
      null,
    ]); // the past-dated exception is not promoted

    const detail = await getPublishedBusinessBySlug(fixture.slug);
    expect(detail.state).toBe("ready");
    if (detail.state !== "ready") return;
    expect(detail.business.services.map((item) => item.name)).toEqual([
      "Fixture haircut",
      "Fixture colour",
    ]);
    expect(detail.business.services[0]?.priceDisplay).toBe("From £15");
    expect(
      detail.business.openingHours.find((hour) => hour.day === "Monday")
        ?.display,
    ).toBe("09:00–17:00");
    expect(
      detail.business.openingExceptions.map((item) => item.display),
    ).toEqual(["Closed", "10:00–13:00"]);
    // The private address never reaches the public projection.
    expect(JSON.stringify(detail.business)).not.toContain("Private Street");
    expect(JSON.stringify(detail.business)).not.toContain("CF37");
  });

  it("refuses to publish a draft that is no longer complete and writes nothing", async () => {
    await insertPendingBusiness();
    const submitted = await submitBusinessForReview({
      userId: fixture.ownerUserId,
      businessId: fixture.businessId,
    });
    expect(submitted.status).toBe("submitted");

    // Simulate a stale or hand-edited row: only three weekdays remain.
    await getDatabase()
      .update(businessOnboardingDraft)
      .set({ hours: validDraft().hours.slice(0, 3) })
      .where(eq(businessOnboardingDraft.businessId, fixture.businessId));

    expect(
      await approveBusinessPublication({
        adminUserId: fixture.adminUserId,
        businessId: fixture.businessId,
      }),
    ).toEqual({ status: "draft_incomplete" });

    const [row] = await getDatabase()
      .select({ status: business.status })
      .from(business)
      .where(eq(business.id, fixture.businessId));
    expect(row?.status).toBe("pending_review");
    expect(await primaryLocation()).toBeUndefined();
  });

  it("locks the draft while the business is awaiting review", async () => {
    await insertPendingBusiness();
    await submitBusinessForReview({
      userId: fixture.ownerUserId,
      businessId: fixture.businessId,
    });

    const result = await savePersistedBusinessOnboardingDraft({
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile: {
        ...validDraft().profile,
        summary: "Changed after submission.",
      },
    });
    expect(result).toEqual({ status: "locked" });

    const [draft] = await getDatabase()
      .select()
      .from(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, fixture.businessId));
    expect((draft?.profile as { summary: string }).summary).toBe(
      "A fictional studio used by automated promotion tests.",
    );
  });

  it("unlocks the draft again once the review rejects it", async () => {
    await insertPendingBusiness();
    await submitBusinessForReview({
      userId: fixture.ownerUserId,
      businessId: fixture.businessId,
    });
    expect(
      await rejectBusinessPublication({
        adminUserId: fixture.adminUserId,
        businessId: fixture.businessId,
        note: "Please adjust the opening hours.",
      }),
    ).toEqual({ status: "rejected" });

    const saved = await savePersistedBusinessOnboardingDraft({
      businessId: fixture.businessId,
      expectedVersion: 0,
      hours: validDraft({ openingTime: "10:00" }).hours,
    });
    expect(saved.status).toBe("saved");
  });

  it("re-promotes without duplicating rows and retires dropped services", async () => {
    await insertPendingBusiness();
    expect(await submitAndApprove()).toEqual({ status: "approved" });

    // Return the business to a resubmittable state, as a rejection would.
    const database = getDatabase();
    await database
      .update(business)
      .set({ status: "rejected" })
      .where(eq(business.id, fixture.businessId));
    await database
      .update(businessPublication)
      .set({ status: "rejected" })
      .where(eq(businessPublication.businessId, fixture.businessId));

    const edited = validDraft({ openingTime: "10:00" });
    const saved = await savePersistedBusinessOnboardingDraft({
      businessId: fixture.businessId,
      expectedVersion: 0,
      hours: edited.hours,
      services: [edited.services[0]],
    });
    expect(saved.status).toBe("saved");
    expect(await submitAndApprove()).toEqual({ status: "approved" });

    const location = await primaryLocation();
    const rules = await database
      .select()
      .from(openingHoursRule)
      .where(eq(openingHoursRule.businessLocationId, location!.id));
    expect(rules).toHaveLength(7);
    expect(rules.find((rule) => rule.dayOfWeek === 1)?.opensAt).toBe("10:00");

    const services = await database
      .select({ name: service.name, status: service.status })
      .from(service)
      .where(eq(service.businessId, fixture.businessId));
    expect(services).toHaveLength(2);
    expect(
      services.find((item) => item.name === "Fixture haircut")?.status,
    ).toBe("active");
    expect(
      services.find((item) => item.name === "Fixture colour")?.status,
    ).toBe("inactive");

    const locations = await database
      .select({ id: businessLocation.id })
      .from(businessLocation)
      .where(
        and(
          eq(businessLocation.businessId, fixture.businessId),
          eq(businessLocation.isPrimary, true),
        ),
      );
    expect(locations).toHaveLength(1);

    // Retired services stay out of the public projection.
    const detail = await getPublishedBusinessBySlug(fixture.slug);
    expect(detail.state).toBe("ready");
    if (detail.state !== "ready") return;
    expect(detail.business.services.map((item) => item.name)).toEqual([
      "Fixture haircut",
    ]);
  });

  it("promotes on the automatic publication path as well", async () => {
    await insertPendingBusiness();
    const database = getDatabase();
    // Automatic publication needs a working contact and accepted terms.
    await database
      .update(business)
      .set({ publicEmail: "hello@promotion-fixture.test" })
      .where(eq(business.id, fixture.businessId));
    expect(
      await acceptBusinessTerms({
        businessId: fixture.businessId,
        userId: fixture.ownerUserId,
      }),
    ).toBe("accepted");
    expect(
      await configureAutomaticPublication({
        businessId: fixture.businessId,
        enabled: true,
        now: new Date(Date.now() - 60 * 24 * 3_600_000),
      }),
    ).toBe("updated");

    await runLifecycleAutomation(new Date());

    const [row] = await database
      .select({ status: business.status })
      .from(business)
      .where(eq(business.id, fixture.businessId));
    expect(row?.status).toBe("published");
    const location = await primaryLocation();
    expect(location).toBeDefined();
    const rules = await database
      .select()
      .from(openingHoursRule)
      .where(eq(openingHoursRule.businessLocationId, location!.id));
    expect(rules).toHaveLength(7);
    const detail = await getPublishedBusinessBySlug(fixture.slug);
    expect(detail.state).toBe("ready");
  });
});
