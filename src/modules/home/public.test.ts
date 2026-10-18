import { describe, expect, it } from "vitest";
import type { MapPlace } from "@/modules/businesses/map";
import {
  getHomepageDiscovery,
  selectHomepageAreas,
  selectHomepagePlaces,
  toNearPlaces,
} from "./public";

function mapPlace(slug: string, count: number, name = slug): MapPlace {
  return {
    slug,
    name,
    welshName: null,
    coverageStatus: "founding",
    latitude: 51.6,
    longitude: -3.3,
    businessCount: count,
    topCategories: [],
  };
}

describe("homepage discovery composition", () => {
  it("returns bounded public collections", async () => {
    const result = await getHomepageDiscovery();

    expect(result.events.length).toBeLessThanOrEqual(3);
    expect(result.guides.length).toBeLessThanOrEqual(3);
    expect(result.offers.length).toBeLessThanOrEqual(3);
    expect(result.places.length).toBeLessThanOrEqual(6);
  });

  it("asks the event and offer sources for the reader's language", async () => {
    const seen: unknown[] = [];
    const record = (source: string) => async (input?: unknown) => {
      seen.push([source, input]);
      throw new Error("representative source failure");
    };
    const failing = async () => {
      throw new Error("representative source failure");
    };

    await getHomepageDiscovery(
      {
        getFeaturedBusiness: failing,
        getEvents: record("events"),
        getGuides: failing,
        getOffers: record("offers"),
        getPlaces: failing,
        getMap: failing,
        getNewBusinesses: failing,
      },
      "cy",
    );

    expect(seen).toEqual([
      ["events", { locale: "cy" }],
      ["offers", { locale: "cy" }],
    ]);
  });

  it("keeps the featured business place selectable after reference data grows", () => {
    const places = Array.from({ length: 10 }, (_, index) => ({
      slug: index === 9 ? "tonypandy" : `place-${index}`,
    }));

    expect(selectHomepagePlaces(places, "tonypandy")).toEqual([
      { slug: "place-0" },
      { slug: "place-1" },
      { slug: "place-2" },
      { slug: "place-3" },
      { slug: "place-4" },
      { slug: "tonypandy" },
    ]);
  });

  it("fails each source independently without inventing homepage content", async () => {
    const unavailable = async () => {
      throw new Error("representative source failure");
    };

    const result = await getHomepageDiscovery({
      getFeaturedBusiness: unavailable,
      getEvents: unavailable,
      getGuides: unavailable,
      getOffers: unavailable,
      getPlaces: unavailable,
      getMap: unavailable,
      getNewBusinesses: unavailable,
    });

    expect(result).toMatchObject({
      featuredBusiness: null,
      featuredBusinessState: "unavailable",
      events: [],
      eventsState: "unavailable",
      guides: [],
      guidesState: "unavailable",
      offers: [],
      offersState: "unavailable",
      places: [],
      placesState: "unavailable",
      areas: [],
      nearPlaces: [],
      totalBusinesses: null,
      newBusinesses: [],
      newBusinessesState: "unavailable",
    });
  });

  it("ranks area tiles by live business count and keeps the featured place", () => {
    const places = [
      mapPlace("a", 0),
      mapPlace("b", 5),
      mapPlace("c", 2),
      mapPlace("d", 9),
      mapPlace("e", 1),
      mapPlace("f", 3),
      mapPlace("g", 4),
      mapPlace("h", 0),
    ];
    expect(selectHomepageAreas(places, undefined).map((a) => a.slug)).toEqual([
      "d",
      "b",
      "g",
      "f",
      "c",
      "e",
    ]);
    const withFeatured = selectHomepageAreas(places, "h");
    expect(withFeatured).toHaveLength(6);
    expect(withFeatured.at(-1)?.slug).toBe("h");
    expect(withFeatured.at(-1)?.businessCount).toBe(0);
    expect(selectHomepageAreas(places, "no-such-place")).toHaveLength(6);
    expect(selectHomepageAreas([], "x")).toEqual([]);
  });

  it("shares only public locality centroids with the near-you widget", () => {
    const near = toNearPlaces([
      mapPlace("a", 3),
      { ...mapPlace("bad", 1), latitude: Number.NaN },
    ]);
    expect(near).toHaveLength(1);
    expect(Object.keys(near[0]!).sort()).toEqual([
      "latitude",
      "longitude",
      "name",
      "slug",
      "welshName",
    ]);
  });
});
