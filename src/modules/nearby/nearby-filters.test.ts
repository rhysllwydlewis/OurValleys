import { describe, expect, it } from "vitest";
import {
  formatKm,
  nearbyHref,
  nearbyListHrefs,
  nearbyRadiusLinks,
  parseNearbyFilters,
} from "./nearby-filters";

describe("parseNearbyFilters", () => {
  it("defaults to no place and the default distance", () => {
    expect(parseNearbyFilters({})).toEqual({ near: "", radius: 8 });
  });

  it("reads a place slug and an offered distance", () => {
    expect(parseNearbyFilters({ near: "Tonypandy", radius: "3" })).toEqual({
      near: "tonypandy",
      radius: 3,
    });
  });

  it("drops hostile or mangled values instead of passing them on", () => {
    expect(
      parseNearbyFilters({ near: "'; drop table place;--", radius: "1e9" }),
    ).toEqual({ near: "", radius: 8 });
    expect(parseNearbyFilters({ near: ["aberdare", "x"] }).near).toBe(
      "aberdare",
    );
    // A latitude or longitude is never accepted as a place.
    expect(parseNearbyFilters({ near: "51.7132,-3.4451" }).near).toBe("");
  });
});

describe("nearbyHref", () => {
  it("keeps links short and never sends a distance without a place", () => {
    expect(nearbyHref()).toBe("/nearby");
    expect(nearbyHref({ radius: 30 })).toBe("/nearby");
    expect(nearbyHref({ near: "aberdare", radius: 8 })).toBe(
      "/nearby?near=aberdare",
    );
    expect(nearbyHref({ near: "aberdare", radius: 30 })).toBe(
      "/nearby?near=aberdare&radius=30",
    );
  });
});

describe("nearbyRadiusLinks", () => {
  it("offers every distance for the same place and marks the current one", () => {
    const links = nearbyRadiusLinks({ near: "aberdare", radius: 15 });
    expect(links.map((link) => link.radius)).toEqual([3, 8, 15, 30]);
    expect(links.filter((link) => link.current).map((l) => l.radius)).toEqual([
      15,
    ]);
    expect(links[0]!.href).toBe("/nearby?near=aberdare&radius=3");
  });
});

describe("nearbyListHrefs", () => {
  it("opens each full list with the same place and distance", () => {
    const hrefs = nearbyListHrefs({ near: "aberdare", radius: 15 });
    expect(hrefs.openNow).toBe("/businesses?openNow=1&near=aberdare&radius=15");
    expect(hrefs.businesses).toBe("/businesses?near=aberdare&radius=15");
    expect(hrefs.events).toBe("/events?near=aberdare&radius=15");
    expect(hrefs.offers).toBe("/offers?near=aberdare&radius=15");
  });
});

describe("formatKm", () => {
  it("shows one decimal under 10km and whole kilometres above", () => {
    expect(formatKm(0.94)).toBe("0.9");
    expect(formatKm(3)).toBe("3");
    expect(formatKm(9.96)).toBe("10");
    expect(formatKm(12.4)).toBe("12");
  });

  it("never prints a broken number", () => {
    expect(formatKm(Number.NaN)).toBe("0");
    expect(formatKm(-2)).toBe("0");
  });
});
