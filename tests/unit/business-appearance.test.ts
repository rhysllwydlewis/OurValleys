import { describe, expect, it } from "vitest";
import {
  applyAppearanceDraft,
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
      "contact",
      "offers",
      "events",
      "menu",
      "accessibility",
    ]);
    expect(appearance.hiddenSections).toEqual(["hours"]);
    expect(
      resolveVisibleSections(appearance).map((section) => section.id),
    ).toEqual([
      "gallery",
      "services",
      "about",
      "location",
      "contact",
      "offers",
      "events",
      "menu",
      "accessibility",
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
      "contact:panel",
      "offers:cards",
      "events:cards",
      "menu:columns",
      "accessibility:chips",
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

  it("keeps older stored layouts and fills in sections added later", () => {
    const stored = normalizeAppearance({
      templateKey: "warm",
      accentKey: "heather",
      hiddenSections: ["hours"],
      sectionOrder: ["hours", "about", "services", "gallery", "location"],
      sectionLayouts: [
        "about:stacked",
        "services:list",
        "gallery:feature",
        "location:statement",
        "hours:compact",
      ],
    });

    expect(stored.sectionLayouts.about).toBe("stacked");
    expect(stored.sectionLayouts.hours).toBe("compact");
    expect(stored.sectionLayouts.offers).toBe("cards");
    expect(stored.sectionOrder).toEqual([
      "hours",
      "about",
      "services",
      "gallery",
      "location",
      "contact",
      "offers",
      "events",
      "menu",
      "accessibility",
    ]);
  });

  it("drops one unknown layout without discarding the other choices", () => {
    const stored = normalizeAppearance({
      templateKey: "standard",
      accentKey: "valley-green",
      hiddenSections: [],
      sectionOrder: [],
      sectionLayouts: ["about:stacked", "events:carousel", "menu:compact"],
    });

    expect(stored.sectionLayouts.about).toBe("stacked");
    expect(stored.sectionLayouts.menu).toBe("compact");
    expect(stored.sectionLayouts.events).toBe("cards");
  });

  it("serialises every section layout, including the operation sections", () => {
    const serialised = serializeSectionLayouts(
      normalizeAppearance(defaultAppearance).sectionLayouts,
    );
    expect(serialised).toHaveLength(businessSections.length);
    expect(serialised).toContain("menu:columns");
    expect(serialised).toContain("accessibility:chips");
  });

  it("applies unsaved designer choices only from the approved lists", () => {
    const saved = normalizeAppearance(defaultAppearance);
    const draft = applyAppearanceDraft(saved, {
      template: "bold",
      accent: "heather",
      hide: "hours,menu",
      order: "menu,about",
      layouts: "menu:compact,offers:list",
    });

    expect(draft.templateKey).toBe("bold");
    expect(draft.accentKey).toBe("heather");
    expect(draft.hiddenSections).toEqual(["hours", "menu"]);
    expect(draft.sectionOrder.slice(0, 2)).toEqual(["menu", "about"]);
    expect(draft.sectionOrder).toHaveLength(businessSections.length);
    expect(draft.sectionLayouts.menu).toBe("compact");
    expect(draft.sectionLayouts.offers).toBe("list");
  });

  it("ignores unapproved or malformed designer input", () => {
    const saved = normalizeAppearance({
      ...defaultAppearance,
      templateKey: "warm",
      accentKey: "slate-blue",
    });
    const draft = applyAppearanceDraft(saved, {
      template: "url(javascript:alert(1))",
      accent: "#ff0000",
      hide: "<script>,nonsense",
      order: "nope,also-nope",
      layouts: "about:diagonal,:x,menu",
    });

    expect(draft.templateKey).toBe("warm");
    expect(draft.accentKey).toBe("slate-blue");
    expect(draft.hiddenSections).toEqual([]);
    expect(draft.sectionOrder).toEqual(saved.sectionOrder);
    expect(draft.sectionLayouts).toEqual(saved.sectionLayouts);
  });

  it("keeps saved hidden sections when the designer sends no hide list", () => {
    const saved = normalizeAppearance({
      ...defaultAppearance,
      hiddenSections: ["gallery"],
    });
    expect(applyAppearanceDraft(saved, {}).hiddenSections).toEqual(["gallery"]);
    expect(applyAppearanceDraft(saved, { hide: "" }).hiddenSections).toEqual(
      [],
    );
  });
});
