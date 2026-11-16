import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase } from "@/lib/database/client";
import {
  listOfferCategoryCounts,
  listPublicOffers,
} from "@/modules/businesses/public-offers";
import { loadNearby } from "@/modules/nearby/nearby";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

/** Seeded fictional data: one published business in Tonypandy with an offer and an event. */
const fixture = {
  businessSlug: "cwm-coil-heating",
  /** Pending review in the same town: must never appear on a public page. */
  unpublishedBusinessSlug: "rhondda-home-tutoring",
  offerId: "00000000-0000-4000-8000-000000001101",
  eventId: "00000000-0000-4000-8000-000000001201",
  placeSlug: "tonypandy",
  /** About 10km from Tonypandy as the crow flies. */
  distantPlaceSlug: "aberdare",
} as const;

describeDatabase("offers near a place", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("keeps an offer whose business is within the distance", async () => {
    const result = await listPublicOffers({
      near: fixture.placeSlug,
      radius: 3,
    });
    expect(result.state).toBe("ready");
    expect(result.offers.map((offer) => offer.id)).toContain(fixture.offerId);
  });

  it("leaves it out beyond the distance and brings it back when widened", async () => {
    const tight = await listPublicOffers({
      near: fixture.distantPlaceSlug,
      radius: 3,
    });
    expect(tight.state).toBe("ready");
    expect(tight.offers.map((offer) => offer.id)).not.toContain(
      fixture.offerId,
    );

    const wide = await listPublicOffers({
      near: fixture.distantPlaceSlug,
      radius: 30,
    });
    expect(wide.offers.map((offer) => offer.id)).toContain(fixture.offerId);
  });

  it("applies the distance to the category counts as well", async () => {
    const tight = await listOfferCategoryCounts({
      near: fixture.distantPlaceSlug,
      radius: 3,
    });
    const wide = await listOfferCategoryCounts({
      near: fixture.distantPlaceSlug,
      radius: 30,
    });
    const total = (rows: { count: number }[]) =>
      rows.reduce((sum, row) => sum + row.count, 0);
    expect(total(wide)).toBeGreaterThan(total(tight));
  });

  it("ignores an unknown place rather than emptying or failing the list", async () => {
    const all = await listPublicOffers();
    const stale = await listPublicOffers({
      near: "not-a-real-place",
      radius: 3,
    });
    expect(stale.state).toBe("ready");
    expect(stale.total).toBe(all.total);
  });

  it("treats hostile text as data", async () => {
    const result = await listPublicOffers({
      near: "x'; drop table business_offer;--",
      radius: Number.NaN,
    });
    expect(result.state).toBe("ready");
    const after = await listPublicOffers();
    expect(after.offers.map((offer) => offer.id)).toContain(fixture.offerId);
  });
});

describeDatabase("the nearby page's data", () => {
  it("asks for a place before reading anything", async () => {
    expect(await loadNearby({ near: "", radius: 8 })).toEqual({
      state: "choose",
    });
  });

  it("reports an unknown place instead of showing everything", async () => {
    expect(await loadNearby({ near: "not-a-real-place", radius: 8 })).toEqual({
      state: "unknown",
    });
  });

  it("gathers the published business, its event and its offer within the distance", async () => {
    const result = await loadNearby({ near: fixture.placeSlug, radius: 3 });
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.origin.slug).toBe(fixture.placeSlug);
    expect(result.businesses.items.map((item) => item.slug)).toContain(
      fixture.businessSlug,
    );
    expect(result.businesses.total).toBeGreaterThanOrEqual(1);
    expect(result.events.items.map((item) => item.id)).toContain(
      fixture.eventId,
    );
    expect(result.offers.items.map((item) => item.id)).toContain(
      fixture.offerId,
    );
    // Open-now businesses are a subset of those in range.
    expect(result.openNow.total).toBeLessThanOrEqual(result.businesses.total);
    // Neighbours are within the distance, nearest first, never the origin.
    expect(result.places.every((place) => place.distanceKm <= 3)).toBe(true);
    expect(result.places.map((place) => place.slug)).not.toContain(
      fixture.placeSlug,
    );
    const distances = result.places.map((place) => place.distanceKm);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it("never shows a business that is not published", async () => {
    const result = await loadNearby({ near: fixture.placeSlug, radius: 30 });
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    const slugs = [
      ...result.businesses.items.map((item) => item.slug),
      ...result.openNow.items.map((item) => item.slug),
      ...result.events.items.map((item) => item.businessSlug),
      ...result.offers.items.map((item) => item.businessSlug),
    ];
    expect(slugs).not.toContain(fixture.unpublishedBusinessSlug);
  });

  it("is empty from a town out of range and fills when the distance reaches", async () => {
    const tight = await loadNearby({
      near: fixture.distantPlaceSlug,
      radius: 3,
    });
    expect(tight.state).toBe("ready");
    if (tight.state !== "ready") return;
    expect(tight.businesses.items.map((item) => item.slug)).not.toContain(
      fixture.businessSlug,
    );
    expect(tight.offers.items.map((item) => item.id)).not.toContain(
      fixture.offerId,
    );
    expect(tight.events.items.map((item) => item.id)).not.toContain(
      fixture.eventId,
    );

    const wide = await loadNearby({
      near: fixture.distantPlaceSlug,
      radius: 30,
    });
    expect(wide.state).toBe("ready");
    if (wide.state !== "ready") return;
    expect(wide.businesses.items.map((item) => item.slug)).toContain(
      fixture.businessSlug,
    );
  });

  it("counts open-now businesses at the reference time it is given", async () => {
    // 03:00 on a Sunday: the fixture business keeps weekday daytime hours.
    const night = await loadNearby(
      { near: fixture.placeSlug, radius: 3 },
      { now: new Date("2099-02-15T03:00:00Z") },
    );
    expect(night.state).toBe("ready");
    if (night.state !== "ready") return;
    expect(night.openNow.items.map((item) => item.slug)).not.toContain(
      fixture.businessSlug,
    );
    expect(night.businesses.items.map((item) => item.slug)).toContain(
      fixture.businessSlug,
    );
  });
});
