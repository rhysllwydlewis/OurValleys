import { describe, expect, it } from "vitest";
import {
  categoriesHref,
  categoryStats,
  hasCategoryFilters,
  parseCategoryFilters,
  popularCategories,
  selectCategories,
  type CategoryEntry,
} from "@/modules/reference-data/category-directory-model";

const entries: CategoryEntry[] = [
  {
    slug: "cafes",
    name: "Cafés & food",
    welshLabel: "Caffis a bwyd",
    description: "Cafés, bakeries and takeaways.",
    businesses: 4,
  },
  {
    slug: "plumbing",
    name: "Plumbing & heating",
    welshLabel: null,
    description: "Boilers and heating systems.",
    businesses: 9,
  },
  {
    slug: "legal",
    name: "Legal services",
    welshLabel: "Gwasanaethau cyfreithiol",
    description: "Solicitors and advice.",
    businesses: 0,
  },
];

describe("parseCategoryFilters", () => {
  it("reads defaults and normalises untrusted text", () => {
    expect(parseCategoryFilters({})).toEqual({
      q: "",
      listed: false,
      sort: "most",
    });
    expect(
      parseCategoryFilters({ q: ["  a   b  "], listed: "1", sort: "az" }),
    ).toEqual({ q: "a b", listed: true, sort: "az" });
    expect(parseCategoryFilters({ sort: "nonsense", listed: "yes" })).toEqual({
      q: "",
      listed: false,
      sort: "most",
    });
  });
});

describe("categoriesHref", () => {
  it("leaves defaults out and keeps what is set", () => {
    const base = parseCategoryFilters({});
    expect(categoriesHref(base)).toBe("/categories");
    expect(categoriesHref(base, { q: "heat", listed: true, sort: "az" })).toBe(
      "/categories?q=heat&listed=1&sort=az",
    );
  });
});

describe("selectCategories", () => {
  const base = parseCategoryFilters({});

  it("orders by business count, then name", () => {
    expect(selectCategories(entries, base).map((e) => e.slug)).toEqual([
      "plumbing",
      "cafes",
      "legal",
    ]);
  });

  it("orders A to Z", () => {
    expect(
      selectCategories(entries, { ...base, sort: "az" }).map((e) => e.slug),
    ).toEqual(["cafes", "legal", "plumbing"]);
  });

  it("matches names, Welsh labels and descriptions without accents or case", () => {
    expect(selectCategories(entries, { ...base, q: "CAFE" })).toHaveLength(1);
    expect(selectCategories(entries, { ...base, q: "cyfreithiol" })[0]?.slug).toBe(
      "legal",
    );
    expect(selectCategories(entries, { ...base, q: "boilers" })[0]?.slug).toBe(
      "plumbing",
    );
    expect(selectCategories(entries, { ...base, q: "zzz" })).toEqual([]);
  });

  it("hides categories with no businesses when asked", () => {
    expect(
      selectCategories(entries, { ...base, listed: true }).map((e) => e.slug),
    ).toEqual(["plumbing", "cafes"]);
  });
});

describe("stats and shortcuts", () => {
  it("counts categories, listed categories and businesses", () => {
    expect(categoryStats(entries)).toEqual({
      categories: 3,
      withBusinesses: 2,
      businesses: 13,
    });
  });

  it("offers only categories that have businesses, most first", () => {
    expect(popularCategories(entries).map((e) => e.slug)).toEqual([
      "plumbing",
      "cafes",
    ]);
    expect(popularCategories(entries, 1)).toHaveLength(1);
    expect(popularCategories([])).toEqual([]);
  });
});

describe("hasCategoryFilters", () => {
  it("ignores the sort", () => {
    expect(hasCategoryFilters(parseCategoryFilters({ sort: "az" }))).toBe(false);
    expect(hasCategoryFilters(parseCategoryFilters({ listed: "1" }))).toBe(true);
    expect(hasCategoryFilters(parseCategoryFilters({ q: "x" }))).toBe(true);
  });
});
