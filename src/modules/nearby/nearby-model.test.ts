import { describe, expect, it } from "vitest";
import {
  nothingNearby,
  placesWithin,
  widerRadius,
  type NearbyPlaceRow,
} from "./nearby-model";

function row(
  slug: string,
  latitude: number,
  longitude: number,
  placeType = "town",
): NearbyPlaceRow {
  return { slug, name: slug, welshName: null, placeType, latitude, longitude };
}

const origin = row("tonypandy", 51.6226, -3.4551);
const rows = [
  origin,
  row("penygraig", 51.6147, -3.4497),
  row("porth", 51.6135, -3.4086),
  row("aberdare", 51.7131, -3.4437),
  row("rhondda", 51.63, -3.45, "valley"),
  row("broken", Number.NaN, -3.4),
];

describe("placesWithin", () => {
  it("lists localities inside the distance, nearest first, without the origin", () => {
    const found = placesWithin(origin, rows, 8, 12);
    expect(found.map((item) => item.row.slug)).toEqual(["penygraig", "porth"]);
    expect(found[0]!.distanceKm).toBeLessThan(found[1]!.distanceKm);
  });

  it("widens with the distance and honours the limit", () => {
    expect(
      placesWithin(origin, rows, 15, 12).map((item) => item.row.slug),
    ).toContain("aberdare");
    expect(placesWithin(origin, rows, 15, 1)).toHaveLength(1);
    expect(placesWithin(origin, rows, 15, 0)).toHaveLength(0);
  });

  it("leaves out valleys, regions and places with a broken centre", () => {
    const slugs = placesWithin(origin, rows, 30, 12).map(
      (item) => item.row.slug,
    );
    expect(slugs).not.toContain("rhondda");
    expect(slugs).not.toContain("broken");
  });
});

describe("nothingNearby", () => {
  it("is true only when no business, event or offer is in range", () => {
    expect(
      nothingNearby({ openNow: 0, businesses: 0, events: 0, offers: 0 }),
    ).toBe(true);
    expect(
      nothingNearby({ openNow: 0, businesses: 0, events: 1, offers: 0 }),
    ).toBe(false);
    expect(
      nothingNearby({ openNow: 0, businesses: 2, events: 0, offers: 0 }),
    ).toBe(false);
  });
});

describe("widerRadius", () => {
  it("steps to the next offered distance and stops at the widest", () => {
    expect(widerRadius(3, [3, 8, 15, 30])).toBe(8);
    expect(widerRadius(15, [3, 8, 15, 30])).toBe(30);
    expect(widerRadius(30, [3, 8, 15, 30])).toBeNull();
  });
});
