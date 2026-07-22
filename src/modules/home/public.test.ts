import { describe, expect, it } from "vitest";
import { getHomepageDiscovery } from "./public";

describe("homepage discovery composition", () => {
  it("returns bounded public collections", async () => {
    const result = await getHomepageDiscovery();

    expect(result.events.length).toBeLessThanOrEqual(3);
    expect(result.guides.length).toBeLessThanOrEqual(3);
    expect(result.places.length).toBeLessThanOrEqual(6);
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
