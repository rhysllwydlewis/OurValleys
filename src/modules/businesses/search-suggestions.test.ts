import { describe, expect, it } from "vitest";
import {
  escapeLikePattern,
  normaliseSuggestionQuery,
} from "./search-suggestions";

describe("normaliseSuggestionQuery", () => {
  it("rejects empty and one-character input", () => {
    expect(normaliseSuggestionQuery(undefined)).toBeNull();
    expect(normaliseSuggestionQuery("   ")).toBeNull();
    expect(normaliseSuggestionQuery(" a ")).toBeNull();
  });

  it("collapses whitespace and bounds the length", () => {
    expect(normaliseSuggestionQuery("  boiler   repair ")).toBe(
      "boiler repair",
    );
    expect(normaliseSuggestionQuery("x".repeat(200))).toHaveLength(80);
  });
});

describe("escapeLikePattern", () => {
  it("neutralises LIKE wildcards and injection-looking input", () => {
    expect(escapeLikePattern("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(escapeLikePattern("'; drop table business;--")).toBe(
      "'; drop table business;--",
    );
  });
});
