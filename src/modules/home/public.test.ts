import { describe, expect, it } from "vitest";
import { getHomepageDiscovery, selectHomepagePlaces } from "./public";

describe("homepage discovery composition", () => {
  it("returns bounded public collections", async () => {
    const result = await getHomepageDiscovery();

    expect(result.events.length).toBeLessThanOrEqual(3);
    expect(result.guides.length).toBeLessThanOrEqual(3);
    expect(result.places.length).toBeLessThanOrEqual(6);
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
      getGuides: () => {
        throw new Error("representative guide failure");
      },
      getPlaces: unavailable,
    });

    expect(result).toMatchObject({
      featuredBusiness: null,
      featuredBusinessState: "unavailable",
      events: [],
      eventsState: "unavailable",
      guides: [],
      guidesState: "unavailable",
      places: [],
      placesState: "unavailable",
    });
  });
});
