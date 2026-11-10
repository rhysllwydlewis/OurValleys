import { describe, expect, it } from "vitest";
import {
  EMPTY_PLACE_PROFILE,
  parseStoredFacts,
  placeProfileInputSchema,
  profileCompleteness,
  resolvePlaceProfile,
  toParagraphs,
  type PlaceProfile,
} from "./place-profile-model";

const placeId = "00000000-0000-4000-8000-000000000001";
const full: PlaceProfile = {
  welshSummary: "Crynodeb Cymraeg.",
  about: "First paragraph.\n\nSecond paragraph\nwraps.",
  aboutCy: "Paragraff cyntaf.",
  facts: [
    {
      label: "Market day",
      labelCy: "Diwrnod marchnad",
      value: "Saturday",
      valueCy: "Dydd Sadwrn",
    },
    { label: "Parking", labelCy: "", value: "Free after 6pm", valueCy: "" },
  ],
};

describe("toParagraphs", () => {
  it("splits on blank lines and joins soft wraps", () => {
    expect(toParagraphs("A one.\r\n\r\nB\ntwo.\n\n\n\nC")).toEqual([
      "A one.",
      "B two.",
      "C",
    ]);
  });
  it("returns nothing for empty text", () => {
    expect(toParagraphs(null)).toEqual([]);
    expect(toParagraphs("  \n\n ")).toEqual([]);
  });
});

describe("placeProfileInputSchema", () => {
  it("normalises blank text to null and defaults facts", () => {
    const parsed = placeProfileInputSchema.parse({
      placeId,
      welshSummary: "  ",
      about: " Hello ",
    });
    expect(parsed).toMatchObject({
      welshSummary: null,
      about: "Hello",
      aboutCy: null,
      facts: [],
    });
  });
  it("rejects a bad place id, too many facts and over-long text", () => {
    expect(placeProfileInputSchema.safeParse({ placeId: "x" }).success).toBe(
      false,
    );
    const fact = { label: "L", value: "V" };
    expect(
      placeProfileInputSchema.safeParse({
        placeId,
        facts: Array.from({ length: 9 }, () => fact),
      }).success,
    ).toBe(false);
    expect(
      placeProfileInputSchema.safeParse({ placeId, about: "x".repeat(3001) })
        .success,
    ).toBe(false);
  });
  it("requires both a label and a value on every fact", () => {
    expect(
      placeProfileInputSchema.safeParse({
        placeId,
        facts: [{ label: "Parking", value: " " }],
      }).success,
    ).toBe(false);
  });
});

describe("parseStoredFacts", () => {
  it("keeps valid facts and drops garbage", () => {
    expect(parseStoredFacts("nope")).toEqual([]);
    const facts = parseStoredFacts([
      { label: "A", value: "B" },
      { label: 1 },
      null,
    ]);
    expect(facts).toEqual([
      { label: "A", labelCy: "", value: "B", valueCy: "" },
    ]);
  });
  it("caps the list", () => {
    const many = Array.from({ length: 20 }, () => ({ label: "A", value: "B" }));
    expect(parseStoredFacts(many)).toHaveLength(8);
  });
});

describe("resolvePlaceProfile", () => {
  it("shows English copy to English readers, never Welsh-only swaps", () => {
    const view = resolvePlaceProfile("English summary.", full, false);
    expect(view.summary).toBe("English summary.");
    expect(view.summaryLang).toBe("en");
    expect(view.about).toEqual(["First paragraph.", "Second paragraph wraps."]);
    expect(view.facts[0]).toMatchObject({
      label: "Market day",
      valueLang: "en",
    });
  });
  it("shows Welsh where written and marks fall-back text as English", () => {
    const view = resolvePlaceProfile("English summary.", full, true);
    expect(view.summary).toBe("Crynodeb Cymraeg.");
    expect(view.summaryLang).toBe("cy");
    expect(view.aboutLang).toBe("cy");
    expect(view.facts[0]).toMatchObject({
      label: "Diwrnod marchnad",
      value: "Dydd Sadwrn",
      labelLang: "cy",
      valueLang: "cy",
    });
    expect(view.facts[1]).toMatchObject({
      label: "Parking",
      labelLang: "en",
      valueLang: "en",
    });
  });
  it("falls back to English about text when no Welsh exists", () => {
    const view = resolvePlaceProfile(
      "S",
      { ...full, aboutCy: null, welshSummary: null },
      true,
    );
    expect(view.aboutLang).toBe("en");
    expect(view.summaryLang).toBe("en");
    expect(view.about).toHaveLength(2);
  });
  it("reports no profile for a place without one", () => {
    const view = resolvePlaceProfile("S", null, false);
    expect(view.hasProfile).toBe(false);
    expect(view.summary).toBe("S");
    expect(resolvePlaceProfile("S", EMPTY_PLACE_PROFILE, true).hasProfile).toBe(
      false,
    );
  });
});

describe("profileCompleteness", () => {
  it("lists what is missing", () => {
    const empty = profileCompleteness(EMPTY_PLACE_PROFILE);
    expect(empty.done).toBe(0);
    expect(empty.missing).toHaveLength(5);
    const partial = profileCompleteness(full);
    expect(partial.missing).toEqual([
      "At least three good-to-know facts",
      "Welsh wording for every fact",
    ]);
  });
});
