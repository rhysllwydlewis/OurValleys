import { describe, expect, it } from "vitest";
import {
  applySuggestedFact,
  normalisePlaceSuggestion,
} from "./place-suggestion-model";

const base = { placeSlug: "tonypandy", kind: "correction", message: "Hello" };

describe("normalisePlaceSuggestion", () => {
  it("accepts a correction and trims it", () => {
    expect(
      normalisePlaceSuggestion({ ...base, message: "  The pool closed.  " }),
    ).toMatchObject({
      kind: "correction",
      message: "The pool closed.",
      factLabel: null,
    });
  });

  it("keeps paragraphs but collapses blank-line runs", () => {
    expect(
      normalisePlaceSuggestion({ ...base, message: "a\r\n\r\n\r\n\r\nb" })
        ?.message,
    ).toBe("a\n\nb");
  });

  it("requires a heading and a short value for a fact", () => {
    expect(
      normalisePlaceSuggestion({ ...base, kind: "fact", message: "Thursday" }),
    ).toBeNull();
    expect(
      normalisePlaceSuggestion({
        ...base,
        kind: "fact",
        factLabel: "Market day",
        message: "Thursday",
      }),
    ).toMatchObject({ factLabel: "Market day", message: "Thursday" });
    expect(
      normalisePlaceSuggestion({
        ...base,
        kind: "fact",
        factLabel: "Market day",
        message: "x".repeat(241),
      }),
    ).toBeNull();
  });

  it("rejects bad slugs, kinds, types and lengths", () => {
    for (const bad of [
      null,
      [],
      "x",
      { ...base, placeSlug: "../etc" },
      { ...base, placeSlug: "" },
      { ...base, kind: "delete" },
      { ...base, message: 5 },
      { ...base, message: "ab" },
      { ...base, message: "x".repeat(501) },
      { ...base, factLabel: 4 },
    ]) {
      expect(normalisePlaceSuggestion(bad)).toBeNull();
    }
  });

  it("passes the honeypot through", () => {
    expect(
      normalisePlaceSuggestion({ ...base, website: "spam" })?.website,
    ).toBe("spam");
  });
});

describe("applySuggestedFact", () => {
  const fact = (label: string) => ({
    label,
    labelCy: "",
    value: "v",
    valueCy: "",
  });
  const suggestion = {
    kind: "fact" as const,
    factLabel: "Parking",
    message: "Free",
  };

  it("appends a new fact", () => {
    const result = applySuggestedFact([fact("Market day")], suggestion);
    expect(result.ok && result.facts.map((f) => f.label)).toEqual([
      "Market day",
      "Parking",
    ]);
  });

  it("refuses a duplicate heading regardless of case", () => {
    expect(applySuggestedFact([fact("parking")], suggestion)).toEqual({
      ok: false,
      reason: "duplicate",
    });
  });

  it("refuses when the profile is full", () => {
    const full = Array.from({ length: 8 }, (_, i) => fact(`F${i}`));
    expect(applySuggestedFact(full, suggestion)).toEqual({
      ok: false,
      reason: "full",
    });
  });

  it("refuses non-facts", () => {
    expect(
      applySuggestedFact([], { ...suggestion, kind: "correction" }),
    ).toEqual({ ok: false, reason: "not_a_fact" });
  });
});
