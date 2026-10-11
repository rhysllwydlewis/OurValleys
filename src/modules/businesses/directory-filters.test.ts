import { describe, expect, it } from "vitest";
import {
  activeFilterKinds,
  countAdvancedFilters,
  directoryHref,
  hrefWithoutFilter,
  paginationWindow,
  parseDirectoryFilters,
  withFilters,
} from "./directory-filters";

describe("parseDirectoryFilters", () => {
  it("uses safe defaults for an empty query string", () => {
    const filters = parseDirectoryFilters({});
    expect(filters).toMatchObject({
      q: "",
      category: "",
      place: "",
      near: "",
      radius: 8,
      sort: "relevance",
      page: 1,
      openNow: false,
      emergency: false,
    });
    expect(activeFilterKinds(filters)).toEqual([]);
  });

  it("normalises hostile and malformed values", () => {
    const filters = parseDirectoryFilters({
      q: `  ${"x".repeat(200)}  `,
      category: ["first", "second"],
      radius: "9999",
      sort: "drop table",
      page: "-4",
      openNow: "true",
      verified: "1",
    });
    expect(filters.q).toHaveLength(80);
    expect(filters.category).toBe("first");
    expect(filters.radius).toBe(8);
    expect(filters.sort).toBe("relevance");
    expect(filters.page).toBe(1);
    expect(filters.openNow).toBe(false);
    expect(filters.verified).toBe(true);
  });
});

describe("directoryHref", () => {
  it("omits defaults and keeps the radius only with a near place", () => {
    expect(directoryHref({})).toBe("/businesses");
    expect(directoryHref({ radius: 15 })).toBe("/businesses");
    expect(directoryHref({ near: "tonypandy", radius: 15 })).toBe(
      "/businesses?near=tonypandy&radius=15",
    );
    expect(directoryHref({ near: "tonypandy", radius: 8 })).toBe(
      "/businesses?near=tonypandy",
    );
  });

  it("round-trips every filter through parse", () => {
    const original = parseDirectoryFilters({
      q: "boiler & flue",
      category: "plumbing-heating",
      place: "tonypandy",
      near: "porth",
      radius: "15",
      sort: "az",
      page: "3",
      openNow: "1",
      verified: "1",
      accessible: "1",
      welshSpeaking: "1",
      delivery: "1",
      collection: "1",
      emergency: "1",
    });
    const href = directoryHref(original);
    const reparsed = parseDirectoryFilters(
      Object.fromEntries(new URL(href, "https://x.test").searchParams),
    );
    expect(reparsed).toEqual(original);
  });
});

describe("removing filters", () => {
  const filters = parseDirectoryFilters({
    q: "cafe",
    category: "food",
    near: "porth",
    radius: "15",
    openNow: "1",
    sort: "az",
    page: "2",
  });

  it("removes one filter, keeps the rest and resets paging", () => {
    expect(hrefWithoutFilter(filters, "q")).toBe(
      "/businesses?category=food&openNow=1&near=porth&radius=15&sort=az",
    );
    expect(hrefWithoutFilter(filters, "openNow")).toBe(
      "/businesses?q=cafe&category=food&near=porth&radius=15&sort=az",
    );
  });

  it("drops the radius together with the near place", () => {
    expect(hrefWithoutFilter(filters, "near")).toBe(
      "/businesses?q=cafe&category=food&openNow=1&sort=az",
    );
  });

  it("changing a filter resets the page", () => {
    expect(withFilters(filters, { sort: "newest" }).page).toBe(1);
  });

  it("counts only the filters held in the collapsible panel", () => {
    expect(countAdvancedFilters(filters)).toBe(2);
    expect(activeFilterKinds(filters)).toEqual([
      "q",
      "category",
      "near",
      "openNow",
    ]);
  });
});

describe("paginationWindow", () => {
  it("is empty for a single page", () => {
    expect(paginationWindow(1, 1)).toEqual([]);
    expect(paginationWindow(1, 0)).toEqual([]);
  });

  it("lists every page when there are few", () => {
    expect(paginationWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it("marks gaps around the current page", () => {
    expect(paginationWindow(1, 20)).toEqual([1, 2, null, 20]);
    expect(paginationWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(paginationWindow(20, 20)).toEqual([1, null, 19, 20]);
  });
});
