import { describe, expect, it } from "vitest";
import {
  normaliseSuggestionInput,
  suggestionDedupeKey,
} from "@/modules/businesses/suggestion-input";

const valid = { name: "  Cwm   Café ", placeText: "Treorchy" };

describe("normaliseSuggestionInput", () => {
  it("trims, collapses whitespace and nulls optional fields", () => {
    expect(normaliseSuggestionInput(valid)).toEqual({
      name: "Cwm Café",
      placeText: "Treorchy",
      categoryText: null,
      note: null,
      contactEmail: null,
      dedupeKey: "cwm cafe|treorchy",
      website: "",
    });
  });

  it("lower-cases a valid email and rejects a malformed one", () => {
    expect(
      normaliseSuggestionInput({ ...valid, contactEmail: "Ann@Example.COM" })
        ?.contactEmail,
    ).toBe("ann@example.com");
    expect(
      normaliseSuggestionInput({ ...valid, contactEmail: "not-an-email" }),
    ).toBeNull();
  });

  it.each([
    ["non-object", "x"],
    ["array", []],
    ["short name", { ...valid, name: "a" }],
    ["missing place", { name: "Cafe" }],
    ["long name", { ...valid, name: "n".repeat(121) }],
    ["long note", { ...valid, note: "n".repeat(501) }],
    ["non-string category", { ...valid, categoryText: 5 }],
  ])("rejects %s", (_label, input) => {
    expect(normaliseSuggestionInput(input)).toBeNull();
  });

  it("passes the honeypot value through for the action to check", () => {
    expect(
      normaliseSuggestionInput({ ...valid, website: "http://spam" })?.website,
    ).toBe("http://spam");
  });
});

describe("suggestionDedupeKey", () => {
  it("ignores case, accents and punctuation", () => {
    expect(suggestionDedupeKey("The Bryn-Café!", "Pontypridd")).toBe(
      suggestionDedupeKey("the bryn cafe", "PONTYPRIDD"),
    );
  });
});
