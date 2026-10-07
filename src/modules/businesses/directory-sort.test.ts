import { describe, expect, it } from "vitest";
import {
  NEW_LISTING_DAYS,
  isNewListing,
  parseDirectorySort,
} from "./directory-sort";

describe("parseDirectorySort", () => {
  it("accepts every allowlisted option", () => {
    for (const option of ["relevance", "az", "newest", "recently-updated"]) {
      expect(parseDirectorySort(option)).toBe(option);
    }
  });

  it("falls back to relevance for unknown, empty or missing values", () => {
    expect(parseDirectorySort("price")).toBe("relevance");
    expect(parseDirectorySort("AZ")).toBe("relevance");
    expect(parseDirectorySort("; drop table business")).toBe("relevance");
    expect(parseDirectorySort("")).toBe("relevance");
    expect(parseDirectorySort(undefined)).toBe("relevance");
  });
});

describe("isNewListing", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  it("is true inside the window and on its boundary", () => {
    expect(isNewListing(daysAgo(1), now)).toBe(true);
    expect(isNewListing(daysAgo(NEW_LISTING_DAYS), now)).toBe(true);
  });

  it("is false once the window has passed", () => {
    expect(isNewListing(daysAgo(NEW_LISTING_DAYS + 1), now)).toBe(false);
  });

  it("is false for missing or future publication dates", () => {
    expect(isNewListing(null, now)).toBe(false);
    expect(isNewListing(undefined, now)).toBe(false);
    expect(isNewListing(daysAgo(-1), now)).toBe(false);
  });
});
