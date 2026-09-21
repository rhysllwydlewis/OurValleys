import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { category, place } from "@/lib/database/schema/business";
import { placeCoordinate } from "@/lib/database/schema/reference";
import { listActiveCategories } from "@/modules/reference-data/categories";
import {
  getPlaceBySlug,
  listActivePlaces,
  listNearbyPlaces,
} from "@/modules/reference-data/places";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  activeCategoryId: "00000000-0000-4000-8000-000000000221",
  inactiveCategoryId: "00000000-0000-4000-8000-000000000222",
  activePlaceId: "00000000-0000-4000-8000-000000000321",
  inactivePlaceId: "00000000-0000-4000-8000-000000000322",
  nearPlaceId: "00000000-0000-4000-8000-000000000323",
  farPlaceId: "00000000-0000-4000-8000-000000000324",
  uncoordinatedPlaceId: "00000000-0000-4000-8000-000000000325",
} as const;

describeDatabase("public reference data lookups", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values([
      {
        id: fixture.activeCategoryId,
        name: "Fixture active category",
        slug: "fixture-active-category",
        description: "Fictional category used only by automated tests.",
        status: "active",
      },
      {
        id: fixture.inactiveCategoryId,
        name: "Fixture inactive category",
        slug: "fixture-inactive-category",
        description: "Fictional category used only by automated tests.",
        status: "retired",
      },
    ]);
    await database.insert(place).values([
      {
        id: fixture.activePlaceId,
        canonicalName: "Fixture active place",
        welshName: "Lle prawf",
        slug: "fixture-active-place",
        placeType: "town",
        coverageStatus: "pilot",
        editorialSummary: "Fictional place used only by automated tests.",
        status: "active",
      },
      {
        id: fixture.inactivePlaceId,
        canonicalName: "Fixture inactive place",
        slug: "fixture-inactive-place",
        placeType: "town",
        editorialSummary: "Fictional place used only by automated tests.",
        status: "retired",
      },
      {
        id: fixture.nearPlaceId,
        canonicalName: "Fixture near place",
        slug: "fixture-near-place",
        placeType: "town",
        editorialSummary: "Fictional place used only by automated tests.",
        status: "active",
      },
      {
        id: fixture.farPlaceId,
        canonicalName: "Fixture far place",
        slug: "fixture-far-place",
        placeType: "town",
        editorialSummary: "Fictional place used only by automated tests.",
        status: "active",
      },
      {
        id: fixture.uncoordinatedPlaceId,
        canonicalName: "Fixture uncoordinated place",
        slug: "fixture-uncoordinated-place",
        placeType: "town",
        editorialSummary: "Fictional place used only by automated tests.",
        status: "active",
      },
    ]);
    await database.insert(placeCoordinate).values([
      { placeId: fixture.activePlaceId, latitude: 51.6, longitude: -3.4 },
      { placeId: fixture.nearPlaceId, latitude: 51.61, longitude: -3.41 },
      { placeId: fixture.farPlaceId, latitude: 52.5, longitude: -1.9 },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    const placeIds = [
      fixture.activePlaceId,
      fixture.inactivePlaceId,
      fixture.nearPlaceId,
      fixture.farPlaceId,
      fixture.uncoordinatedPlaceId,
    ];
    await database
      .delete(category)
      .where(
        inArray(category.id, [
          fixture.activeCategoryId,
          fixture.inactiveCategoryId,
        ]),
      );
    await database
      .delete(placeCoordinate)
      .where(inArray(placeCoordinate.placeId, placeIds));
    await database.delete(place).where(inArray(place.id, placeIds));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("lists only active categories, ordered by name", async () => {
    const categories = await listActiveCategories();

    expect(categories).toContainEqual({
      id: fixture.activeCategoryId,
      slug: "fixture-active-category",
      name: "Fixture active category",
      welshLabel: null,
    });
    expect(
      categories.some((entry) => entry.id === fixture.inactiveCategoryId),
    ).toBe(false);
  });

  it("lists only active places, ordered by canonical name", async () => {
    const places = await listActivePlaces();

    expect(places).toContainEqual({
      id: fixture.activePlaceId,
      slug: "fixture-active-place",
      name: "Fixture active place",
    });
    expect(places.some((entry) => entry.id === fixture.inactivePlaceId)).toBe(
      false,
    );
  });

  it("returns the full detail record for an active place slug", async () => {
    const detail = await getPlaceBySlug("fixture-active-place");

    expect(detail).toMatchObject({
      id: fixture.activePlaceId,
      slug: "fixture-active-place",
      name: "Fixture active place",
      welshName: "Lle prawf",
      coverageStatus: "pilot",
    });
  });

  it("returns null for a retired or unknown place slug", async () => {
    expect(await getPlaceBySlug("fixture-inactive-place")).toBeNull();
    expect(await getPlaceBySlug("does-not-exist")).toBeNull();
  });

  it("ranks nearby places by distance and excludes places without coordinates", async () => {
    const nearby = await listNearbyPlaces(fixture.activePlaceId, 1_000);
    const slugs = nearby.map((entry) => entry.slug);

    expect(slugs.indexOf("fixture-near-place")).toBeLessThan(
      slugs.indexOf("fixture-far-place"),
    );
    expect(slugs).not.toContain("fixture-active-place");
    expect(slugs).not.toContain("fixture-uncoordinated-place");
    const near = nearby.find((entry) => entry.slug === "fixture-near-place");
    expect(near?.distanceKm).toBeGreaterThan(0);
    expect(near?.distanceKm).toBeLessThan(5);
  });

  it("limits the returned number of nearby places", async () => {
    const nearby = await listNearbyPlaces(fixture.activePlaceId, 2);
    expect(nearby).toHaveLength(2);
  });

  it("returns no nearby places for a place without a stored coordinate", async () => {
    expect(await listNearbyPlaces(fixture.uncoordinatedPlaceId)).toEqual([]);
  });
});
