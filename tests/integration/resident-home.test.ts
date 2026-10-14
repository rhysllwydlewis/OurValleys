import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessPublication,
  businessSite,
  category,
  place,
} from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import { placeRelationship } from "@/lib/database/schema/reference";
import {
  savedBusiness,
  savedEvent,
  savedPlace,
} from "@/lib/database/schema/saved-discovery";
import {
  listComingUpForUser,
  loadResidentHome,
  loadSavedItems,
} from "@/modules/residents/resident-home-data";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const id = (n: number) => `00000000-0000-4000-8000-00000000${4000 + n}`;
const fixture = {
  userId: id(1),
  otherUserId: id(2),
  categoryId: id(3),
  valleyId: id(4),
  townId: id(5),
  elsewhereId: id(6),
  savedBusinessId: id(7),
  townBusinessId: id(8),
  hiddenBusinessId: id(9),
  savedAndDirectEventId: id(10),
  townEventId: id(11),
  hiddenEventId: id(12),
  endedEventId: id(13),
  farEventId: id(14),
  cancelledEventId: id(15),
  directEventId: id(16),
  offerSoonId: id(17),
  offerLaterId: id(18),
  offerExpiredId: id(19),
} as const;

const now = new Date("2026-09-28T09:00:00.000Z");
const inDays = (days: number) => new Date(now.getTime() + days * 86_400_000);

async function seedBusiness(input: {
  id: string;
  slug: string;
  name: string;
  placeId: string;
  status?: "published" | "pending_review";
}) {
  const database = getDatabase();
  const status = input.status ?? "published";
  await database.insert(business).values({
    id: input.id,
    tradingName: input.name,
    slug: input.slug,
    summary: "A fictional business for resident home tests.",
    description: "Fictional.",
    primaryCategoryId: fixture.categoryId,
    businessType: "limited_company",
    status,
  });
  await database.insert(businessLocation).values({
    businessId: input.id,
    placeId: input.placeId,
    locationType: "premises",
    isPrimary: true,
  });
  if (status !== "published") return;
  const [site] = await database
    .insert(businessSite)
    .values({
      businessId: input.id,
      templateKey: "universal",
      status: "published",
      platformPath: `/b/${input.slug}`,
      publishedAt: now,
    })
    .returning({ id: businessSite.id });
  await database.insert(businessPublication).values({
    businessId: input.id,
    businessSiteId: site!.id,
    status: "published",
    publishedAt: now,
  });
}

function event(
  eventId: string,
  businessId: string,
  title: string,
  startsInDays: number,
  extra: Partial<typeof businessEvent.$inferInsert> = {},
) {
  return {
    id: eventId,
    businessId,
    title,
    description: "Fictional event.",
    startsAt: inDays(startsInDays),
    status: "active",
    ...extra,
  };
}

describeDatabase("resident home", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.userId,
        name: "Home Resident",
        email: "resident.home@example.test",
        emailVerified: true,
        savedPlaceDigestEmails: true,
      },
      {
        id: fixture.otherUserId,
        name: "Other Resident",
        email: "resident.other@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Resident home fixture services",
      slug: "resident-home-fixture-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(place).values(
      [
        [fixture.valleyId, "Fixture Valley", "valley"],
        [fixture.townId, "Fixture Town", "town"],
        [fixture.elsewhereId, "Fixture Elsewhere", "town"],
      ].map(([placeId, name, placeType]) => ({
        id: placeId!,
        canonicalName: name!,
        slug: `${name!.toLowerCase().replace(/\s+/g, "-")}-resident-home`,
        placeType: placeType!,
        editorialSummary: "Fictional.",
      })),
    );
    await database.insert(placeRelationship).values({
      parentPlaceId: fixture.valleyId,
      childPlaceId: fixture.townId,
      relationshipType: "contains",
    });
    await seedBusiness({
      id: fixture.savedBusinessId,
      slug: "resident-home-saved",
      name: "Resident Home Saved Business",
      placeId: fixture.elsewhereId,
    });
    await seedBusiness({
      id: fixture.townBusinessId,
      slug: "resident-home-town",
      name: "Resident Home Town Business",
      placeId: fixture.townId,
    });
    await seedBusiness({
      id: fixture.hiddenBusinessId,
      slug: "resident-home-hidden",
      name: "Resident Home Hidden Business",
      placeId: fixture.townId,
      status: "pending_review",
    });
    await database.insert(businessEvent).values([
      event(
        fixture.savedAndDirectEventId,
        fixture.savedBusinessId,
        "Saved twice",
        3,
      ),
      event(
        fixture.townEventId,
        fixture.townBusinessId,
        "In a saved valley",
        5,
      ),
      event(fixture.hiddenEventId, fixture.hiddenBusinessId, "Unpublished", 4),
      event(fixture.endedEventId, fixture.townBusinessId, "Already over", -2, {
        endsAt: inDays(-1),
      }),
      event(fixture.farEventId, fixture.townBusinessId, "Too far ahead", 45),
      event(fixture.cancelledEventId, fixture.townBusinessId, "Cancelled", 6, {
        status: "cancelled",
      }),
      event(
        fixture.directEventId,
        fixture.savedBusinessId,
        "Saved on its own",
        9,
      ),
    ]);
    await database.insert(businessOffer).values([
      {
        id: fixture.offerLaterId,
        businessId: fixture.savedBusinessId,
        title: "Ends later",
        description: "Fictional.",
        status: "active",
        endsAt: inDays(20),
      },
      {
        id: fixture.offerSoonId,
        businessId: fixture.savedBusinessId,
        title: "Ends soon",
        description: "Fictional.",
        status: "active",
        endsAt: inDays(2),
      },
      {
        id: fixture.offerExpiredId,
        businessId: fixture.savedBusinessId,
        title: "Already ended",
        description: "Fictional.",
        status: "active",
        endsAt: inDays(-1),
      },
    ]);
    await database.insert(savedBusiness).values([
      { userId: fixture.userId, businessId: fixture.savedBusinessId },
      { userId: fixture.userId, businessId: fixture.hiddenBusinessId },
    ]);
    await database.insert(savedEvent).values([
      { userId: fixture.userId, eventId: fixture.savedAndDirectEventId },
      { userId: fixture.userId, eventId: fixture.directEventId },
      { userId: fixture.userId, eventId: fixture.hiddenEventId },
    ]);
    await database
      .insert(savedPlace)
      .values({ userId: fixture.userId, placeId: fixture.valleyId });
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const businessId of [
      fixture.savedBusinessId,
      fixture.townBusinessId,
      fixture.hiddenBusinessId,
    ]) {
      await database.delete(business).where(eq(business.id, businessId));
    }
    for (const placeId of [
      fixture.valleyId,
      fixture.townId,
      fixture.elsewhereId,
    ]) {
      await database.delete(place).where(eq(place.id, placeId));
    }
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.userId));
    await database.delete(user).where(eq(user.id, fixture.otherUserId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("merges saved events with saved-business and saved-place events, once each, soonest first", async () => {
    const events = await listComingUpForUser(fixture.userId, now);
    expect(events.map((item) => [item.title, item.source])).toEqual([
      ["Saved twice", "saved"],
      ["In a saved valley", "place"],
      ["Saved on its own", "saved"],
    ]);
  });

  it("leaves out unpublished, finished, cancelled and distant events", async () => {
    const titles = (await listComingUpForUser(fixture.userId, now)).map(
      (item) => item.title,
    );
    for (const hidden of [
      "Unpublished",
      "Already over",
      "Too far ahead",
      "Cancelled",
    ]) {
      expect(titles).not.toContain(hidden);
    }
  });

  it("never shows one resident another resident's saved items", async () => {
    expect(await listComingUpForUser(fixture.otherUserId, now)).toEqual([]);
    const home = await loadResidentHome(fixture.otherUserId, now);
    expect(home).toMatchObject({
      state: "ready",
      counts: { businesses: 0, events: 0, places: 0 },
      comingUp: [],
      businesses: [],
      places: [],
    });
  });

  it("loads the home with offers, counts and preferences", async () => {
    const home = await loadResidentHome(fixture.userId, now);
    if (home.state !== "ready") throw new Error("expected a ready home");

    // The unpublished business is saved but not shown or counted.
    expect(home.counts).toEqual({ businesses: 1, events: 2, places: 1 });
    expect(home.unavailable).toEqual([]);
    expect(home.preferences).toEqual({ digestOn: true, remindersOn: false });

    const [saved] = home.businesses;
    expect(saved?.tradingName).toBe("Resident Home Saved Business");
    expect(saved?.offer?.title).toBe("Ends soon");
    expect(saved?.upcomingEventCount).toBe(2);

    // A valley includes the businesses and events of its towns.
    const [valley] = home.places;
    expect(valley?.businessCount).toBe(1);
    expect(valley?.upcomingEventCount).toBe(1);
  });

  it("loads saved items with the same visibility rules", async () => {
    const items = await loadSavedItems(fixture.userId, now);
    if (items.state !== "ready") throw new Error("expected ready items");
    expect(items.businesses.map((item) => item.slug)).toEqual([
      "resident-home-saved",
    ]);
    expect(items.events.map((item) => item.title)).toEqual([
      "Saved twice",
      "Saved on its own",
    ]);
    expect(items.places.map((item) => item.name)).toEqual(["Fixture Valley"]);
  });

  it("lists every saved place even past the counting cap, without counts for the rest", async () => {
    const database = getDatabase();
    const extra = Array.from({ length: 13 }, (_, index) => ({
      id: `00000000-0000-4000-8000-00000000${4100 + index}`,
      canonicalName: `Fixture Extra ${index}`,
      slug: `fixture-extra-${index}-resident-home`,
      placeType: "town",
      editorialSummary: "Fictional.",
    }));
    try {
      await database.insert(place).values(extra);
      await database
        .insert(savedPlace)
        .values(
          extra.map((item) => ({ userId: fixture.userId, placeId: item.id })),
        );
      const items = await loadSavedItems(fixture.userId, now);
      if (items.state !== "ready") throw new Error("expected ready items");
      // The valley plus 13 extras: all listed, none silently dropped.
      expect(items.places).toHaveLength(14);
      expect(
        items.places.filter((item) => item.businessCount === null),
      ).toHaveLength(2);
      const home = await loadResidentHome(fixture.userId, now);
      if (home.state !== "ready") throw new Error("expected a ready home");
      expect(home.counts.places).toBe(14);
    } finally {
      for (const item of extra) {
        await database.delete(place).where(eq(place.id, item.id));
      }
    }
  });

  it("does not count demonstration businesses in a saved place", async () => {
    const database = getDatabase();
    await database
      .update(business)
      .set({ isDemo: true })
      .where(eq(business.id, fixture.townBusinessId));
    const home = await loadResidentHome(fixture.userId, now);
    if (home.state !== "ready") throw new Error("expected a ready home");
    expect(home.places[0]?.businessCount).toBe(0);
    expect(home.places[0]?.upcomingEventCount).toBe(0);
  });

  it("rejects an identifier that is not a user id without touching the database", async () => {
    expect(await loadResidentHome("not-a-uuid", now)).toEqual({
      state: "invalid",
    });
    expect(await loadSavedItems("not-a-uuid", now)).toEqual({
      state: "invalid",
    });
    expect(await listComingUpForUser("not-a-uuid", now)).toEqual([]);
  });
});
