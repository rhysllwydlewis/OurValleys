import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase } from "@/lib/database/client";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { getValleysMap } from "@/modules/businesses/map";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

describeDatabase("valleys map data", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("returns every active place with a coordinate, including empty ones", async () => {
    const map = await getValleysMap();
    expect(map.state).toBe("ready");
    if (map.state !== "ready") return;

    expect(map.places.length).toBeGreaterThan(20);
    expect(map.places.some((place) => place.businessCount === 0)).toBe(true);
    for (const place of map.places) {
      expect(Number.isFinite(place.latitude)).toBe(true);
      expect(Number.isFinite(place.longitude)).toBe(true);
    }
    const tonypandy = map.places.find((place) => place.slug === "tonypandy");
    expect(tonypandy?.businessCount).toBeGreaterThanOrEqual(1);
    expect(map.totalBusinesses).toBe(
      map.places.reduce((sum, place) => sum + place.businessCount, 0),
    );
  });

  it("agrees with the public directory for every place", async () => {
    const map = await getValleysMap();
    if (map.state !== "ready") throw new Error("map unavailable");

    for (const place of map.places.filter((item) => item.businessCount > 0)) {
      const directory = await listPublishedBusinesses({ place: place.slug });
      expect(directory.state).toBe("ready");
      if (directory.state !== "ready") return;
      expect(place.businessCount).toBe(directory.total);
    }
  });

  it("narrows counts by category and ignores unknown or malformed categories", async () => {
    const all = await getValleysMap();
    if (all.state !== "ready") throw new Error("map unavailable");
    const category = all.categories[0];
    expect(category).toBeDefined();

    const filtered = await getValleysMap({ category: category!.slug });
    if (filtered.state !== "ready") throw new Error("map unavailable");
    expect(filtered.selectedCategory).toBe(category!.slug);
    expect(filtered.totalBusinesses).toBe(category!.count);
    expect(filtered.totalBusinesses).toBeLessThanOrEqual(all.totalBusinesses);
    expect(filtered.categories).toEqual(all.categories);

    for (const bad of [
      "not-a-category",
      "x'; drop table business; --",
      "",
      "A".repeat(500),
    ]) {
      const ignored = await getValleysMap({ category: bad });
      if (ignored.state !== "ready") throw new Error("map unavailable");
      expect(ignored.selectedCategory).toBeNull();
      expect(ignored.totalBusinesses).toBe(all.totalBusinesses);
    }
  });

  it("exposes only public place and category fields", async () => {
    const map = await getValleysMap();
    if (map.state !== "ready") throw new Error("map unavailable");
    const placeWithBusiness = map.places.find(
      (place) => place.businessCount > 0,
    );
    expect(Object.keys(placeWithBusiness!).sort()).toEqual([
      "businessCount",
      "coverageStatus",
      "latitude",
      "longitude",
      "name",
      "slug",
      "topCategories",
      "welshName",
    ]);
    expect(placeWithBusiness!.topCategories.length).toBeLessThanOrEqual(3);
  });
});
