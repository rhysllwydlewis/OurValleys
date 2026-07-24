import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { category, place } from "@/lib/database/schema/business";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  activeCategoryId: "00000000-0000-4000-8000-000000000221",
  inactiveCategoryId: "00000000-0000-4000-8000-000000000222",
  activePlaceId: "00000000-0000-4000-8000-000000000321",
  inactivePlaceId: "00000000-0000-4000-8000-000000000322",
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
        slug: "fixture-active-place",
        placeType: "town",
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
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(category)
      .where(
        inArray(category.id, [
          fixture.activeCategoryId,
          fixture.inactiveCategoryId,
        ]),
      );
    await database
      .delete(place)
      .where(
        inArray(place.id, [fixture.activePlaceId, fixture.inactivePlaceId]),
      );
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
});
