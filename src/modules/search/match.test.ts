import { describe, expect, it } from "vitest";
import {
  escapeLikePattern,
  foldText,
  matchesFolded,
  normaliseSiteQuery,
} from "./match";

describe("normaliseSiteQuery", () => {
  it("returns null for empty, whitespace-only and one-character input", () => {
    expect(normaliseSiteQuery(undefined)).toBeNull();
    expect(normaliseSiteQuery("   ")).toBeNull();
    expect(normaliseSiteQuery(" a ")).toBeNull();
  });

  it("collapses whitespace and bounds the length", () => {
    expect(normaliseSiteQuery("  coffee   shop ")).toBe("coffee shop");
    expect(normaliseSiteQuery("x".repeat(200))).toHaveLength(80);
  });
});

describe("escapeLikePattern", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLikePattern("100%_\\")).toBe("100\\%\\_\\\\");
  });
});

describe("matchesFolded", () => {
  it("ignores case and accents", () => {
    expect(foldText("Ŵyl Ŷ")).toBe("wyl y");
    expect(matchesFolded(["Ystradgynlais"], "ystrad")).toBe(true);
    expect(matchesFolded(["Tŷ Coffi"], "ty coffi")).toBe(true);
  });

  it("checks every label and tolerates missing ones", () => {
    expect(matchesFolded([null, undefined, "Caffi"], "caf")).toBe(true);
    expect(matchesFolded([null, "Bakery"], "coffee")).toBe(false);
  });
});
