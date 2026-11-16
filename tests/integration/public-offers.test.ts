import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { businessOffer } from "@/lib/database/schema/business-operations";
import {
  listOfferCategoryCounts,
  listPublicOffers,
} from "@/modules/businesses/public-offers";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  businessId: "00000000-0000-4000-8000-000000000401",
  offerId: "00000000-0000-4000-8000-000000001101",
  categorySlug: "plumbing-heating",
  placeSlug: "tonypandy",
} as const;

const day = 86_400_000;
const extraIds = {
  expired: "00000000-0000-4000-8000-00000000f101",
  future: "00000000-0000-4000-8000-00000000f102",
  draft: "00000000-0000-4000-8000-00000000f103",
  hidden: "00000000-0000-4000-8000-00000000f104",
  soon: "00000000-0000-4000-8000-00000000f105",
  seventhDayLate: "00000000-0000-4000-8000-00000000f106",
  eighthDayEarly: "00000000-0000-4000-8000-00000000f107",
} as const;

const londonDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** A moment on the British calendar day `days` after `from`, at a UTC clock time. */
function onLondonDay(from: number, days: number, utcTime: string): Date {
  // Midday keeps the date arithmetic clear of clock changes.
  const [year, month, date] = londonDate
    .format(new Date(from))
    .split("-")
    .map(Number);
  const target = new Date(Date.UTC(year!, month! - 1, date! + days, 12));
  return new Date(`${target.toISOString().slice(0, 10)}T${utcTime}Z`);
}

describeDatabase("public offer discovery", () => {
  beforeAll(async () => {
    const now = Date.now();
    const base = {
      businessId: fixture.businessId,
      description: "Integration test offer.",
    };
    await getDatabase()
      .insert(businessOffer)
      .values([
        {
          ...base,
          id: extraIds.expired,
          title: "Expired offer",
          status: "active",
          endsAt: new Date(now - day),
        },
        {
          ...base,
          id: extraIds.future,
          title: "Future offer",
          status: "active",
          startsAt: new Date(now + day),
        },
        { ...base, id: extraIds.draft, title: "Draft offer", status: "draft" },
        {
          ...base,
          id: extraIds.hidden,
          title: "Hidden offer",
          status: "hidden",
        },
        {
          ...base,
          id: extraIds.soon,
          title: "Ends soon offer",
          status: "active",
          endsAt: new Date(now + 2 * day),
        },
        {
          ...base,
          id: extraIds.seventhDayLate,
          title: "Ends late on the seventh day",
          status: "active",
          // 22:45 UTC is 22:45 or 23:45 in Britain: still that calendar day.
          endsAt: onLondonDay(now, 7, "22:45:00"),
        },
        {
          ...base,
          id: extraIds.eighthDayEarly,
          title: "Ends early on the eighth day",
          status: "active",
          // 00:30 UTC is 00:30 or 01:30 in Britain: already that calendar day.
          endsAt: onLondonDay(now, 8, "00:30:00"),
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await getDatabase()
      .delete(businessOffer)
      .where(inArray(businessOffer.id, Object.values(extraIds)));
    await closeDatabase();
  });

  it("lists the active fixture offer and the soon-ending offer", async () => {
    const result = await listPublicOffers();

    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    const ids = result.offers.map((offer) => offer.id);
    expect(ids).toContain(fixture.offerId);
    expect(ids).toContain(extraIds.soon);
  });

  it("orders soonest-ending first and open-ended offers last", async () => {
    const result = await listPublicOffers();
    if (result.state !== "ready") throw new Error("expected ready");
    const ids = result.offers.map((offer) => offer.id);
    expect(ids.indexOf(extraIds.soon)).toBeLessThan(
      ids.indexOf(fixture.offerId),
    );
  });

  it("excludes expired, not-yet-started, draft and hidden offers", async () => {
    const result = await listPublicOffers();
    if (result.state !== "ready") throw new Error("expected ready");
    const ids = result.offers.map((offer) => offer.id);
    for (const excluded of [
      extraIds.expired,
      extraIds.future,
      extraIds.draft,
      extraIds.hidden,
    ]) {
      expect(ids).not.toContain(excluded);
    }
  });

  it("excludes offers of unpublished businesses", async () => {
    const database = getDatabase();
    const { business } = await import("@/lib/database/schema/business");
    const [original] = await database
      .select({ status: business.status })
      .from(business)
      .where(eq(business.id, fixture.businessId));
    try {
      await database
        .update(business)
        .set({ status: "suspended" })
        .where(eq(business.id, fixture.businessId));
      const result = await listPublicOffers();
      if (result.state !== "ready") throw new Error("expected ready");
      expect(result.offers.map((offer) => offer.id)).not.toContain(
        fixture.offerId,
      );
    } finally {
      await database
        .update(business)
        .set({ status: original?.status ?? "published" })
        .where(eq(business.id, fixture.businessId));
    }
  });

  it("filters by place, category and search term", async () => {
    const byPlace = await listPublicOffers({ place: fixture.placeSlug });
    const byCategory = await listPublicOffers({
      category: fixture.categorySlug,
    });
    const wrongPlace = await listPublicOffers({ place: "treorchy" });
    const byQuery = await listPublicOffers({ query: "heating check" });
    const noMatch = await listPublicOffers({ query: "no-such-search-term" });

    for (const result of [byPlace, byCategory, byQuery]) {
      if (result.state !== "ready") throw new Error("expected ready");
      expect(result.offers.map((offer) => offer.id)).toContain(fixture.offerId);
    }
    if (wrongPlace.state !== "ready" || noMatch.state !== "ready") {
      throw new Error("expected ready");
    }
    expect(wrongPlace.offers.map((offer) => offer.id)).not.toContain(
      fixture.offerId,
    );
    expect(noMatch.total).toBe(0);
  });

  it("narrows to offers ending within a number of days and leaves open-ended ones out", async () => {
    const week = await listPublicOffers({ endingWithinDays: 7 });
    const oneDay = await listPublicOffers({ endingWithinDays: 1 });
    if (week.state !== "ready" || oneDay.state !== "ready")
      throw new Error("expected ready");
    const weekIds = week.offers.map((offer) => offer.id);
    expect(weekIds).toContain(extraIds.soon);
    expect(weekIds).not.toContain(fixture.offerId);
    expect(oneDay.offers.map((offer) => offer.id)).not.toContain(extraIds.soon);
  });

  it("counts 'within 7 days' in British calendar days, as the cards do", async () => {
    const week = await listPublicOffers({ endingWithinDays: 7 });
    if (week.state !== "ready") throw new Error("expected ready");
    const ids = week.offers.map((offer) => offer.id);
    // Up to 7 days and 23 hours away, but it ends on the seventh day.
    expect(ids).toContain(extraIds.seventhDayLate);
    expect(ids).not.toContain(extraIds.eighthDayEarly);
  });

  it("says when each offer was written and last edited", async () => {
    const result = await listPublicOffers({ sort: "newest" });
    if (result.state !== "ready") throw new Error("expected ready");
    const offer = result.offers.find((item) => item.id === extraIds.soon);
    expect(offer?.createdAt).toBeInstanceOf(Date);
    expect(offer?.updatedAt).toBeInstanceOf(Date);
  });

  it("sorts newest first when asked", async () => {
    const result = await listPublicOffers({ sort: "newest" });
    if (result.state !== "ready") throw new Error("expected ready");
    // The soon-ending fixture row was inserted after the seeded offer.
    const ids = result.offers.map((offer) => offer.id);
    expect(ids.indexOf(extraIds.soon)).toBeLessThan(
      ids.indexOf(fixture.offerId),
    );
  });

  it("names the place and category of each offer", async () => {
    const result = await listPublicOffers({ query: "heating check" });
    if (result.state !== "ready") throw new Error("expected ready");
    const offer = result.offers.find((item) => item.id === fixture.offerId);
    expect(offer?.placeName).toBeTruthy();
    expect(offer?.categoryName).toBeTruthy();
  });

  it("counts active offers per category, ignoring the category filter itself", async () => {
    const counts = await listOfferCategoryCounts({
      category: "no-such-category",
    });
    const heating = counts.find((item) => item.slug === fixture.categorySlug);
    expect(heating?.count).toBeGreaterThanOrEqual(2);
    const narrowed = await listOfferCategoryCounts({ query: "no-such-term" });
    expect(narrowed).toEqual([]);
    const week = await listOfferCategoryCounts({ endingWithinDays: 7 });
    expect(
      week.find((item) => item.slug === fixture.categorySlug)?.count,
    ).toBeGreaterThanOrEqual(1);
  });

  it("does not read typed wildcards as patterns", async () => {
    const result = await listPublicOffers({ query: "100%" });
    if (result.state !== "ready") throw new Error("expected ready");
    expect(result.total).toBe(0);
  });
});
