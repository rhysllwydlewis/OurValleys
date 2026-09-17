import { describe, expect, it } from "vitest";
import { guideSectionsSchema, parseStoredSections } from "./shared";

const validSection = {
  heading: "Start with a local search",
  body: "Use the business directory to explore published café profiles.",
  href: "/businesses?q=coffee",
  linkLabel: "Search coffee businesses",
};

describe("guideSectionsSchema", () => {
  it("accepts one to eight valid sections", () => {
    expect(guideSectionsSchema.safeParse([validSection]).success).toBe(true);
    expect(
      guideSectionsSchema.safeParse(Array(8).fill(validSection)).success,
    ).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(guideSectionsSchema.safeParse([]).success).toBe(false);
  });

  it("rejects more than eight sections", () => {
    expect(
      guideSectionsSchema.safeParse(Array(9).fill(validSection)).success,
    ).toBe(false);
  });

  it("rejects a section link that does not start with a slash", () => {
    expect(
      guideSectionsSchema.safeParse([
        { ...validSection, href: "https://example.com" },
      ]).success,
    ).toBe(false);
  });

  it("rejects a section missing a heading or body", () => {
    expect(
      guideSectionsSchema.safeParse([{ ...validSection, heading: "" }]).success,
    ).toBe(false);
    expect(
      guideSectionsSchema.safeParse([{ ...validSection, body: "short" }])
        .success,
    ).toBe(false);
  });
});

describe("parseStoredSections", () => {
  it("returns the parsed sections for a valid stored value", () => {
    expect(parseStoredSections([validSection])).toEqual([validSection]);
  });

  it("returns an empty array for a malformed stored value", () => {
    expect(parseStoredSections(null)).toEqual([]);
    expect(parseStoredSections("not an array")).toEqual([]);
    expect(parseStoredSections([{ heading: "Only a heading" }])).toEqual([]);
  });
});
