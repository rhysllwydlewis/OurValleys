import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabaseClient } from "@/lib/database/client";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { buildMapValleys, getValleysMap } from "@/modules/businesses/map";

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
    expect(filtered.selectedCategory?.slug).toBe(category!.slug);
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
      "valleySlug",
      "welshName",
    ]);
    expect(placeWithBusiness!.topCategories.length).toBeLessThanOrEqual(3);
  });

  it("treats a real category with no businesses as a valid, empty filter", async () => {
    const all = await getValleysMap();
    if (all.state !== "ready") throw new Error("map unavailable");
    const represented = new Set(all.categories.map((item) => item.slug));
    const [empty] = await getDatabaseClient()<Array<{ slug: string }>>`
      select slug from category where status = 'active' order by slug
    `.then((rows) => rows.filter((row) => !represented.has(row.slug)));
    expect(empty).toBeDefined();

    const filtered = await getValleysMap({ category: empty!.slug });
    if (filtered.state !== "ready") throw new Error("map unavailable");
    expect(filtered.selectedCategory?.slug).toBe(empty!.slug);
    expect(filtered.totalBusinesses).toBe(0);
    expect(filtered.places.length).toBe(all.places.length);
  });

  it("leaves out empty regions and valleys but keeps localities and any place with a business", async () => {
    const map = await getValleysMap();
    if (map.state !== "ready") throw new Error("map unavailable");
    const slugs = new Set(map.places.map((place) => place.slug));
    expect(slugs.has("tonypandy")).toBe(true);
    expect(slugs.has("pontypridd")).toBe(true);
    expect(slugs.has("rhondda-fawr")).toBe(false);
    expect(slugs.has("rhondda-cynon-taf")).toBe(false);
  });

  it("groups places into valleys that add up to the directory", async () => {
    const map = await getValleysMap();
    if (map.state !== "ready") throw new Error("map unavailable");

    expect(map.valleys.length).toBeGreaterThan(5);
    const slugs = new Set(map.valleys.map((valley) => valley.slug));
    expect(slugs.size).toBe(map.valleys.length);
    for (const place of map.places) {
      if (place.valleySlug) expect(slugs.has(place.valleySlug)).toBe(true);
    }
    for (const valley of map.valleys) {
      const members = map.places.filter(
        (place) => place.valleySlug === valley.slug,
      );
      expect(valley.placeCount).toBe(members.length);
      expect(valley.businessCount).toBe(
        members.reduce((sum, place) => sum + place.businessCount, 0),
      );
    }
    const rhondda = map.places.find((place) => place.slug === "tonypandy");
    expect(rhondda?.valleySlug).toBeTruthy();
  });

  it("keeps valley counts consistent with the category filter", async () => {
    const all = await getValleysMap();
    if (all.state !== "ready") throw new Error("map unavailable");
    const category = all.categories[0]!;
    const filtered = await getValleysMap({ category: category.slug });
    if (filtered.state !== "ready") throw new Error("map unavailable");
    expect(
      filtered.valleys.reduce((sum, valley) => sum + valley.businessCount, 0),
    ).toBeLessThanOrEqual(filtered.totalBusinesses);
    expect(filtered.valleys.map((valley) => valley.slug)).toEqual(
      all.valleys.map((valley) => valley.slug),
    );
  });

  it("exposes no private business data in valley groupings", async () => {
    const map = await getValleysMap();
    if (map.state !== "ready") throw new Error("map unavailable");
    const text = JSON.stringify(map.valleys);
    expect(text).not.toMatch(/@|\+44|postcode|address/i);
  });
});

describe("buildMapValleys", () => {
  const details = [
    { slug: "b-valley", name: "B Valley", welshName: "Cwm B" },
    { slug: "a-valley", name: "A Valley", welshName: null },
  ];

  it("sums places and businesses per valley, ordered by name", () => {
    const valleys = buildMapValleys(
      [
        { valleySlug: "b-valley", businessCount: 2 },
        { valleySlug: "b-valley", businessCount: 0 },
        { valleySlug: "a-valley", businessCount: 1 },
        { valleySlug: null, businessCount: 9 },
      ],
      details,
    );
    expect(valleys.map((valley) => valley.slug)).toEqual([
      "a-valley",
      "b-valley",
    ]);
    expect(valleys[1]).toMatchObject({
      placeCount: 2,
      businessCount: 2,
      welshName: "Cwm B",
    });
  });

  it("ignores valleys with no mapped place and places in unknown valleys", () => {
    expect(
      buildMapValleys([{ valleySlug: "missing", businessCount: 3 }], details),
    ).toEqual([]);
    expect(buildMapValleys([], details)).toEqual([]);
  });
});
