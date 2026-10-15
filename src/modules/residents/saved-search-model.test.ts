import { describe, expect, it } from "vitest";
import {
  isSavedSearch,
  MAX_SAVED_SEARCHES,
  newResultCount,
  parseSavedSearchInput,
  savedSearchHref,
} from "./saved-search-model";

describe("parseSavedSearchInput", () => {
  it("trims, collapses spaces and folds accents and case into the identity key", () => {
    expect(parseSavedSearchInput("  Caffè   Bach ", "businesses")).toEqual({
      query: "Caffè Bach",
      queryKey: "caffe bach",
      type: "businesses",
    });
  });

  it("falls back to everything for an unknown or missing type", () => {
    expect(parseSavedSearchInput("bakery", "nonsense")?.type).toBe("all");
    expect(parseSavedSearchInput("bakery", undefined)?.type).toBe("all");
  });

  it.each([undefined, null, 42, "", " ", "a", "%%", "..."])(
    "keeps nothing for %j",
    (value) => {
      expect(parseSavedSearchInput(value, "all")).toBeNull();
    },
  );

  it("refuses a query whose folded key outgrows the stored bound", () => {
    // Hangul syllables decompose into several characters when folded.
    expect(parseSavedSearchInput("한".repeat(79), "all")).toBeNull();
  });

  it("bounds a long query to 80 characters", () => {
    const parsed = parseSavedSearchInput("x".repeat(200), "all");
    expect(parsed?.query).toHaveLength(80);
  });
});

describe("newResultCount", () => {
  it("counts only results beyond the last seen total", () => {
    expect(newResultCount(9, 6)).toBe(3);
    expect(newResultCount(6, 6)).toBe(0);
  });

  it("never goes negative when results disappear", () => {
    expect(newResultCount(2, 6)).toBe(0);
  });
});

describe("savedSearchHref", () => {
  it("builds the canonical search address and leaves out the default type", () => {
    expect(savedSearchHref({ query: "pizza", type: "all" })).toBe(
      "/search?q=pizza",
    );
    expect(savedSearchHref({ query: "pizza", type: "events" })).toBe(
      "/search?q=pizza&type=events",
    );
  });
});

describe("isSavedSearch", () => {
  const saved = [{ queryKey: "pizza", type: "all" }];
  it("matches on key and type together", () => {
    expect(isSavedSearch(saved, { queryKey: "pizza", type: "all" })).toBe(true);
    expect(isSavedSearch(saved, { queryKey: "pizza", type: "events" })).toBe(
      false,
    );
  });
});

describe("limits", () => {
  it("keeps the list small enough to count live", () => {
    expect(MAX_SAVED_SEARCHES).toBeLessThanOrEqual(10);
  });
});
