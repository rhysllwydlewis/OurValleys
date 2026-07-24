import { describe, expect, it } from "vitest";
import { getPublicGuideBySlug, listPublicGuides } from "./public";

describe("listPublicGuides", () => {
  it("returns a non-empty, stable list of representative guides", () => {
    const guides = listPublicGuides();
    expect(guides.length).toBeGreaterThan(0);
    expect(listPublicGuides()).toEqual(guides);
  });

  it("gives every guide a unique slug", () => {
    const slugs = listPublicGuides().map((guide) => guide.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every guide at least one section with a working link label", () => {
    for (const guide of listPublicGuides()) {
      expect(guide.sections.length).toBeGreaterThan(0);
      for (const section of guide.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.body.length).toBeGreaterThan(0);
        expect(section.href.startsWith("/")).toBe(true);
        expect(section.linkLabel.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("getPublicGuideBySlug", () => {
  it("returns the matching guide for a known slug", () => {
    const guides = listPublicGuides();
    expect(guides.length).toBeGreaterThan(0);
    const firstGuide = guides[0]!;
    expect(getPublicGuideBySlug(firstGuide.slug)).toEqual(firstGuide);
  });

  it("returns null for an unknown slug", () => {
    expect(getPublicGuideBySlug("not-a-real-guide")).toBeNull();
  });

  it("returns null for an empty slug", () => {
    expect(getPublicGuideBySlug("")).toBeNull();
  });
});
