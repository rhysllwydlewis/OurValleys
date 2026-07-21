import { describe, expect, it } from "vitest";
import {
  businessAccents,
  businessSections,
  contrastRatio,
  defaultAppearance,
  normalizeAppearance,
  resolveCategoryVariant,
  resolveVisibleSections,
  serializeSectionLayouts,
} from "@/modules/businesses/appearance";

describe("business website appearance", () => {
  it("keeps the safe defaults complete and renderable", () => {
    const appearance = normalizeAppearance(defaultAppearance);

    expect(appearance.templateKey).toBe("standard");
    expect(appearance.accentKey).toBe("valley-green");
    expect(appearance.sectionOrder).toEqual(
      businessSections.map((section) => section.id),
    );
    expect(resolveVisibleSections(appearance)).toHaveLength(
      businessSections.length,
    );
  });

  it("normalises duplicate order entries and appends omitted sections", () => {
    const appearance = normalizeAppearance({
      templateKey: "warm",
      accentKey: "heather",
      hiddenSections: ["hours", "hours"],
      sectionOrder: ["gallery", "services", "gallery"],
      sectionLayouts: {
        about: "stacked",
        services: "list",
        gallery: "feature",
        location: "statement",
        hours: "compact",
      },
    });

    expect(appearance.sectionOrder).toEqual([
      "gallery",
      "services",
      "about",
      "location",
      "hours",
    ]);
    expect(appearance.hiddenSections).toEqual(["hours"]);
    expect(resolveVisibleSections(appearance).map((section) => section.id)).toEqual([
      "gallery",
      "services",
      "about",
      "location",
    ]);
    expect(appearance.sectionLayouts.gallery).toBe("feature");
  });

  it("reads stored text-array layouts and rejects an invalid configuration safely", () => {
    const stored = normalizeAppearance({
      templateKey: "bold",
      accentKey: "slate-blue",
      hiddenSections: [],
      sectionOrder: businessSections.map((section) => section.id),
      sectionLayouts: [
        "about:stacked",
        "services:list",
        "gallery:feature",
        "location:statement",
        "hours:compact",
      ],
    });

    expect(stored.sectionLayouts.services).toBe("list");
    expect(serializeSectionLayouts(stored.sectionLayouts)).toEqual([
      "about:stacked",
      "services:list",
      "gallery:feature",
      "location:statement",
      "hours:compact",
    ]);

    const invalid = normalizeAppearance({
      templateKey: "arbitrary-css",
      accentKey: "unsafe",
      hiddenSections: ["unknown"],
      sectionOrder: [],
    });
    expect(invalid).toEqual(defaultAppearance);
  });

  it("keeps white text at WCAG AA contrast on every approved primary colour", () => {
    for (const accent of businessAccents) {
      expect(contrastRatio("#ffffff", accent.primary)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio("#ffffff", accent.strong)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("selects bounded category variants without changing the data model", () => {
    expect(resolveCategoryVariant("Plumbing & Heating")).toBe("trades");
    expect(resolveCategoryVariant("Cafés and bakeries")).toBe("hospitality");
    expect(resolveCategoryVariant("Beauty & Wellbeing")).toBe("wellbeing");
    expect(resolveCategoryVariant("Solicitors", "professional-services")).toBe(
      "professional",
    );
    expect(resolveCategoryVariant("Something completely new")).toBe("general");
  });
});
