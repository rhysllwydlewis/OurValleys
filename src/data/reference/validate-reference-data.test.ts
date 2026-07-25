import { describe, expect, it } from "vitest";
import { businessCategories } from "./business-categories";
import { rctPlaces } from "./rct-places";
import { validateReferenceData } from "./validate-reference-data";

describe("versioned reference data", () => {
  it("contains unique, connected and bounded place and category records", () => {
    expect(validateReferenceData(rctPlaces, businessCategories)).toEqual({
      places: rctPlaces.length,
      categories: businessCategories.length,
      aliases:
        rctPlaces.reduce((total, record) => total + record.aliases.length, 0) +
        businessCategories.reduce(
          (total, record) => total + record.aliases.length,
          0,
        ),
      relationships:
        rctPlaces.filter((record) => record.parentSlug).length +
        businessCategories.filter((record) => record.parentSlug).length,
    });
  });

  it("rejects a hierarchy cycle", () => {
    expect(() =>
      validateReferenceData(
        [
          {
            ...rctPlaces[0],
            slug: "one",
            parentSlug: "two",
          },
          {
            ...rctPlaces[0],
            slug: "two",
            parentSlug: "one",
          },
        ],
        businessCategories,
      ),
    ).toThrow(/cycle/i);
  });
});
