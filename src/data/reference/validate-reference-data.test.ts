import { describe, expect, it } from "vitest";
import { businessCategories } from "./business-categories";
import { councilAreas, valleysPlaces } from "./valleys-places";
import { validateReferenceData } from "./validate-reference-data";

describe("versioned reference data", () => {
  it("contains unique, connected and bounded place and category records", () => {
    expect(validateReferenceData(valleysPlaces, businessCategories)).toEqual({
      places: valleysPlaces.length,
      categories: businessCategories.length,
      aliases:
        valleysPlaces.reduce(
          (total, record) => total + record.aliases.length,
          0,
        ) +
        businessCategories.reduce(
          (total, record) => total + record.aliases.length,
          0,
        ),
      relationships:
        valleysPlaces.filter((record) => record.parentSlug).length +
        businessCategories.filter((record) => record.parentSlug).length,
    });
  });

  it("rejects a hierarchy cycle", () => {
    expect(() =>
      validateReferenceData(
        [
          {
            ...valleysPlaces[0],
            slug: "one",
            parentSlug: "two",
          },
          {
            ...valleysPlaces[0],
            slug: "two",
            parentSlug: "one",
          },
        ],
        businessCategories,
      ),
    ).toThrow(/cycle/i);
  });

  it("includes a top-level region for every South Wales Valleys council area", () => {
    const regionSlugs = new Set<string>(
      valleysPlaces
        .filter((record) => record.parentSlug === null)
        .map((record) => record.slug),
    );

    for (const area of councilAreas) {
      expect(regionSlugs.has(area.slug)).toBe(true);
    }
    expect(regionSlugs.size).toBe(councilAreas.length);
  });
});
