import { describe, expect, it } from "vitest";
import {
  buildPlaceMiniMap,
  buildValleyGlance,
  resolveValleySlug,
} from "@/lib/place-minimap";
import type { MapPlace, MapValley } from "@/modules/businesses/map";

function place(
  slug: string,
  valleySlug: string | null,
  latitude: number,
  longitude: number,
  businessCount: number,
  topCategories: MapPlace["topCategories"] = [],
): MapPlace {
  return {
    slug,
    name: slug.toUpperCase(),
    welshName: null,
    coverageStatus: "active",
    latitude,
    longitude,
    businessCount,
    topCategories,
    valleySlug,
  };
}

const cat = (slug: string, count: number) => ({
  slug,
  name: slug,
  welshLabel: null,
  count,
});

const valleys: MapValley[] = [
  {
    slug: "rhondda",
    name: "Rhondda",
    welshName: "Rhondda",
    placeCount: 3,
    businessCount: 9,
  },
  {
    slug: "cynon",
    name: "Cynon",
    welshName: null,
    placeCount: 1,
    businessCount: 0,
  },
];
const places = [
  place("treorchy", "rhondda", 51.66, -3.5, 5, [
    cat("cafe", 3),
    cat("shop", 2),
  ]),
  place("ton", "rhondda", 51.64, -3.45, 4, [cat("cafe", 1)]),
  place("pentre", "rhondda", 51.65, -3.48, 0),
  place("aberdare", "cynon", 51.71, -3.44, 0),
  place("lonely", null, 51.5, -3.2, 2),
];

describe("resolveValleySlug", () => {
  it("uses the valley a place sits in", () => {
    expect(resolveValleySlug("ton", places, valleys)).toBe("rhondda");
  });
  it("treats a valley page as its own valley", () => {
    expect(resolveValleySlug("cynon", [], valleys)).toBe("cynon");
  });
  it("returns null for places outside any valley and unknown slugs", () => {
    expect(resolveValleySlug("lonely", places, valleys)).toBeNull();
    expect(resolveValleySlug("nowhere", places, valleys)).toBeNull();
  });
});

describe("buildPlaceMiniMap", () => {
  it("draws only the valley's places and marks the current one", () => {
    const map = buildPlaceMiniMap("ton", places, valleys)!;
    expect(map.dots.map((dot) => dot.slug).sort()).toEqual([
      "pentre",
      "ton",
      "treorchy",
    ]);
    expect(map.dots.filter((dot) => dot.current).map((d) => d.slug)).toEqual([
      "ton",
    ]);
    // The current place is drawn last so it sits on top.
    expect(map.dots[map.dots.length - 1]!.slug).toBe("ton");
    expect(map.regionPath.startsWith("M ")).toBe(true);
    for (const dot of map.dots) {
      expect(dot.x).toBeGreaterThanOrEqual(0);
      expect(dot.x).toBeLessThanOrEqual(map.width);
      expect(dot.y).toBeLessThanOrEqual(map.height);
    }
  });
  it("works for a valley page with no current dot", () => {
    const map = buildPlaceMiniMap("rhondda", places, valleys)!;
    expect(map.dots.some((dot) => dot.current)).toBe(false);
    expect(map.businessCount).toBe(9);
  });
  it("handles a single-place valley", () => {
    const map = buildPlaceMiniMap("aberdare", places, valleys)!;
    expect(map.dots).toHaveLength(1);
    expect(Number.isFinite(map.dots[0]!.x)).toBe(true);
  });
  it("returns null when the place is not in a valley or valley is empty", () => {
    expect(buildPlaceMiniMap("lonely", places, valleys)).toBeNull();
    expect(buildPlaceMiniMap("rhondda", [], valleys)).toBeNull();
  });
  it("exposes no business-level data", () => {
    const map = buildPlaceMiniMap("ton", places, valleys)!;
    expect(JSON.stringify(map)).not.toMatch(/address|email|phone/i);
  });
});

describe("buildValleyGlance", () => {
  it("ranks places and sums categories", () => {
    const glance = buildValleyGlance("rhondda", "ton", places)!;
    expect(glance.rows.map((row) => row.slug)).toEqual([
      "treorchy",
      "ton",
      "pentre",
    ]);
    expect(glance.rows[0]!.share).toBe(1);
    expect(glance.rows[2]!.share).toBe(0);
    expect(glance.rows.find((row) => row.current)!.slug).toBe("ton");
    expect(glance.categories.map((c) => [c.slug, c.count])).toEqual([
      ["cafe", 4],
      ["shop", 2],
    ]);
  });
  it("copes with a valley whose places have no businesses", () => {
    const glance = buildValleyGlance("cynon", "cynon", places)!;
    expect(glance.rows[0]!.share).toBe(0);
    expect(glance.categories).toEqual([]);
  });
  it("returns null for an unknown valley", () => {
    expect(buildValleyGlance("nope", "x", places)).toBeNull();
  });
});
