import { describe, expect, it } from "vitest";
import { loadCategorySeed, loadPlaceSeed } from "./loader";

describe("reference seed datasets", () => {
  it("loads unique, valid RCT place records with resolvable parents", async () => {
    const seed = await loadPlaceSeed();
    const slugs = seed.places.map((place) => place.slug);
    const known = new Set(slugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(seed.places.some((place) => place.slug === "rhondda-cynon-taf")).toBe(true);
    for (const place of seed.places) if (place.parentSlug) expect(known.has(place.parentSlug)).toBe(true);
  });

  it("loads unique categories with resolvable parents and search synonyms", async () => {
    const seed = await loadCategorySeed();
    const slugs = seed.categories.map((category) => category.slug);
    const known = new Set(slugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(seed.categories.length).toBeGreaterThanOrEqual(40);
    for (const category of seed.categories) if (category.parentSlug) expect(known.has(category.parentSlug)).toBe(true);
    expect(seed.categories.find((category) => category.slug === "plumbers-heating")?.synonyms).toContain("plumber");
  });
});
