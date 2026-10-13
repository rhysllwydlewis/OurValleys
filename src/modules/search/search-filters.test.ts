import { describe, expect, it } from "vitest";
import {
  addRecentSearch,
  buildSearchTabs,
  parseRecentSearches,
  parseSearchState,
  pickTopMatch,
  searchHref,
  type SearchCounts,
} from "./search-filters";

const none: SearchCounts = {
  businesses: 0,
  offers: 0,
  events: 0,
  places: 0,
  categories: 0,
  guides: 0,
};

describe("parseSearchState", () => {
  it("normalises, bounds and defaults untrusted values", () => {
    expect(parseSearchState({})).toEqual({ q: "", type: "all", page: 1 });
    expect(
      parseSearchState({ q: "  cwm   coil ", type: "events", page: "3" }),
    ).toEqual({ q: "cwm coil", type: "events", page: 3 });
    expect(parseSearchState({ q: "x".repeat(200) }).q).toHaveLength(80);
  });

  it("falls back for unknown types and bad pages", () => {
    const state = parseSearchState({
      type: "admin",
      page: ["-4", "2"],
    });
    expect(state).toMatchObject({ type: "all", page: 1 });
    expect(parseSearchState({ page: "99999999" }).page).toBe(1);
    expect(parseSearchState({ page: "1.5" }).page).toBe(1);
  });

  it("takes the first value when a parameter repeats", () => {
    expect(parseSearchState({ q: ["tea", "coffee"] }).q).toBe("tea");
  });
});

describe("searchHref", () => {
  it("leaves defaults out and encodes the query", () => {
    expect(searchHref({})).toBe("/search");
    expect(searchHref({ q: "café & tea" })).toBe("/search?q=caf%C3%A9+%26+tea");
    expect(searchHref({ q: "tea", type: "all", page: 1 })).toBe(
      "/search?q=tea",
    );
    expect(searchHref({ q: "tea", type: "offers", page: 2 })).toBe(
      "/search?q=tea&type=offers&page=2",
    );
  });
});

describe("buildSearchTabs", () => {
  it("lists All and only the types with results", () => {
    const tabs = buildSearchTabs(
      "tea",
      { ...none, businesses: 3, guides: 1 },
      "all",
    );
    expect(tabs.map((tab) => [tab.type, tab.count])).toEqual([
      ["all", 4],
      ["businesses", 3],
      ["guides", 1],
    ]);
    expect(tabs[0]?.current).toBe(true);
    expect(tabs[1]?.href).toBe("/search?q=tea&type=businesses");
  });

  it("keeps the open type visible even when it has no results", () => {
    const tabs = buildSearchTabs("tea", { ...none, events: 2 }, "offers");
    expect(tabs.map((tab) => tab.type)).toEqual(["all", "offers", "events"]);
    expect(tabs.find((tab) => tab.current)?.type).toBe("offers");
  });
});

describe("pickTopMatch", () => {
  const candidates = {
    business: [
      { slug: "cwm-coil-heating", labels: ["Cwm & Coil Heating", null] },
    ],
    place: [{ slug: "tonypandy", labels: ["Tonypandy", "Tonypandy"] }],
    category: [
      { slug: "coffee-food", labels: ["Coffee & food", "Coffi a bwyd"] },
    ],
  };

  it("prefers an exact name regardless of case and accents", () => {
    expect(pickTopMatch("TONYPANDY", candidates)).toMatchObject({
      kind: "place",
      slug: "tonypandy",
      exact: true,
    });
    expect(pickTopMatch("cwm & coil heating", candidates)).toMatchObject({
      kind: "business",
      exact: true,
    });
  });

  it("falls back to a name that starts with the query", () => {
    expect(pickTopMatch("cwm", candidates)).toMatchObject({
      kind: "business",
      exact: false,
    });
    expect(pickTopMatch("coffi", candidates)).toMatchObject({
      kind: "category",
      label: "Coffi a bwyd",
    });
  });

  it("does not guess a prefix from fewer than three characters", () => {
    expect(pickTopMatch("cw", candidates)).toBeNull();
    expect(pickTopMatch("to", candidates)).toBeNull();
    expect(pickTopMatch("cwm", candidates)).not.toBeNull();
  });

  it("does not guess from a name that merely contains the query", () => {
    expect(pickTopMatch("coil", candidates)).toBeNull();
    expect(pickTopMatch("a", candidates)).toBeNull();
    expect(pickTopMatch("", candidates)).toBeNull();
  });

  it("lets an exact match beat an earlier prefix match", () => {
    const result = pickTopMatch("tony", {
      business: [],
      place: [{ slug: "tonypandy", labels: ["Tonypandy"] }],
      category: [{ slug: "tony", labels: ["Tony"] }],
    });
    expect(result).toMatchObject({ kind: "category", exact: true });
  });
});

describe("recent searches", () => {
  it("adds newest first without duplicates and caps the list", () => {
    let list: string[] = [];
    for (const word of ["a1", "b2", "c3", "d4", "e5", "f6", "g7"]) {
      list = addRecentSearch(list, word);
    }
    expect(list).toEqual(["g7", "f6", "e5", "d4", "c3", "b2"]);
    expect(addRecentSearch(list, "  D4 ")).toEqual([
      "D4",
      "g7",
      "f6",
      "e5",
      "c3",
      "b2",
    ]);
  });

  it("ignores queries that are too short to search", () => {
    expect(addRecentSearch(["tea"], "x")).toEqual(["tea"]);
  });

  it("reads stored data defensively", () => {
    expect(parseRecentSearches(null)).toEqual([]);
    expect(parseRecentSearches("not json")).toEqual([]);
    expect(parseRecentSearches('{"a":1}')).toEqual([]);
    expect(parseRecentSearches('["tea", 4, "tea", "", "coffee"]')).toEqual([
      "tea",
      "coffee",
    ]);
  });
});
