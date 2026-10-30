import { describe, expect, it } from "vitest";
import {
  GUIDE_SECTION_LIMIT,
  guideSectionsSchema,
  isInternalGuidePath,
  parseStoredSections,
} from "./shared";

const validSection = {
  heading: "Start with a local search",
  body: "Use the business directory to explore published café profiles.",
  href: "/businesses?q=coffee",
  linkLabel: "Search coffee businesses",
};

describe("guideSectionsSchema", () => {
  it("accepts one to the maximum number of valid sections", () => {
    expect(guideSectionsSchema.safeParse([validSection]).success).toBe(true);
    expect(
      guideSectionsSchema.safeParse(
        Array(GUIDE_SECTION_LIMIT).fill(validSection),
      ).success,
    ).toBe(true);
  });

  it("rejects an empty list and more than the maximum", () => {
    expect(guideSectionsSchema.safeParse([]).success).toBe(false);
    expect(
      guideSectionsSchema.safeParse(
        Array(GUIDE_SECTION_LIMIT + 1).fill(validSection),
      ).success,
    ).toBe(false);
  });

  it("rejects a link to another site, including protocol-relative and backslash forms", () => {
    for (const href of [
      "https://example.com",
      "//example.com/path",
      "/\\example.com",
      "/has space",
      "javascript:alert(1)",
    ]) {
      expect(
        guideSectionsSchema.safeParse([{ ...validSection, href }]).success,
      ).toBe(false);
    }
  });

  it("allows a section with no link, and refuses a label without a link or a link without a label", () => {
    expect(
      guideSectionsSchema.safeParse([
        { ...validSection, href: "", linkLabel: "" },
      ]).success,
    ).toBe(true);
    expect(
      guideSectionsSchema.safeParse([{ ...validSection, href: "" }]).success,
    ).toBe(false);
    expect(
      guideSectionsSchema.safeParse([{ ...validSection, linkLabel: "" }])
        .success,
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

  it("defaults the kind to text and rejects an unknown kind", () => {
    const parsed = guideSectionsSchema.parse([validSection]);
    expect(parsed[0]?.kind).toBe("text");
    expect(
      guideSectionsSchema.safeParse([{ ...validSection, kind: "script" }])
        .success,
    ).toBe(false);
  });

  it("gives every section a unique id, replacing repeats and filling gaps", () => {
    const parsed = guideSectionsSchema.parse([
      { ...validSection, id: "abc" },
      { ...validSection, id: "abc" },
      validSection,
    ]);
    const ids = parsed.map((section) => section.id);
    expect(ids[0]).toBe("abc");
    expect(new Set(ids).size).toBe(3);
  });
});

describe("isInternalGuidePath", () => {
  it("accepts a path or a path with a query and rejects everything else", () => {
    expect(isInternalGuidePath("/events?when=weekend")).toBe(true);
    expect(isInternalGuidePath("events")).toBe(false);
    expect(isInternalGuidePath("//evil.example")).toBe(false);
  });
});

describe("parseStoredSections", () => {
  it("returns the parsed sections, with ids assigned by position, for an old stored value", () => {
    expect(parseStoredSections([validSection])).toEqual([
      { ...validSection, id: "s1", kind: "text" },
    ]);
  });

  it("keeps a section whose stored link points off-site, without the link", () => {
    const [section] = parseStoredSections([
      { ...validSection, href: "//evil.example", linkLabel: "Go" },
    ]);
    expect(section).toMatchObject({ href: "", linkLabel: "" });
    expect(section?.heading).toBe(validSection.heading);
  });

  it("returns an empty array for a malformed stored value", () => {
    expect(parseStoredSections(null)).toEqual([]);
    expect(parseStoredSections("not an array")).toEqual([]);
    expect(parseStoredSections([{ heading: "Only a heading" }])).toEqual([]);
  });
});
