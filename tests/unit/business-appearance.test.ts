import { describe, expect, it } from "vitest";
import {
  applyAppearanceDraft,
  businessAccents,
  businessSections,
  businessTemplates,
  contrastRatio,
  defaultAppearance,
  defaultAppearanceForVariant,
  normalizeAppearance,
  parseStoredTheme,
  resolveCategoryVariant,
  resolveVisibleSections,
  serializeSectionLayouts,
  serializeTheme,
} from "@/modules/businesses/appearance";
import { businessSiteTheme } from "@/components/business-site-theme";

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

describe("template and theme model", () => {
  it("offers six distinct templates and ten accents", () => {
    expect(businessTemplates.map((template) => template.key)).toEqual([
      "standard",
      "warm",
      "bold",
      "editorial",
      "immersive",
      "simple",
    ]);
    expect(businessAccents).toHaveLength(10);
    expect(new Set(businessAccents.map((accent) => accent.key)).size).toBe(10);
  });

  it("keeps every accent readable on its soft tint and with white text", () => {
    for (const accent of businessAccents) {
      expect(contrastRatio(accent.strong, accent.soft)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrastRatio(accent.primary, accent.soft)).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });

  it("round-trips corner and typeface choices through the stored array", () => {
    const stored = [
      ...serializeSectionLayouts(defaultAppearance.sectionLayouts),
      ...serializeTheme({ cornerKey: "round", typefaceKey: "modern" }),
    ];
    expect(parseStoredTheme(stored)).toEqual({
      cornerKey: "round",
      typefaceKey: "modern",
    });
    const appearance = normalizeAppearance({
      ...defaultAppearance,
      sectionLayouts: stored,
      ...parseStoredTheme(stored),
    });
    expect(appearance.cornerKey).toBe("round");
    expect(appearance.typefaceKey).toBe("modern");
    // The layout reader must not be disturbed by the extra entries.
    expect(appearance.sectionLayouts).toEqual(defaultAppearance.sectionLayouts);
  });

  it("treats an appearance saved before themes existed as the standard look", () => {
    const appearance = normalizeAppearance({
      templateKey: "bold",
      accentKey: "slate-blue",
      hiddenSections: [],
      sectionOrder: [],
    });
    expect(appearance.cornerKey).toBe("soft");
    expect(appearance.typefaceKey).toBe("classic");
  });

  it("falls back for unknown stored theme values rather than failing", () => {
    const appearance = normalizeAppearance({
      ...defaultAppearance,
      cornerKey: "polygon",
      typefaceKey: "comic-sans",
    });
    expect(appearance.cornerKey).toBe("soft");
    expect(appearance.typefaceKey).toBe("classic");
    expect(parseStoredTheme(["theme.corners", "theme.typeface:x", 4])).toEqual({
      typefaceKey: "x",
    });
    expect(parseStoredTheme("nope")).toEqual({});
  });

  it("applies approved corner and typeface drafts and ignores the rest", () => {
    const draft = applyAppearanceDraft(defaultAppearance, {
      template: "immersive",
      corners: "square",
      typeface: "modern",
    });
    expect(draft.templateKey).toBe("immersive");
    expect(draft.cornerKey).toBe("square");
    expect(draft.typefaceKey).toBe("modern");

    const hostile = applyAppearanceDraft(draft, {
      corners: "50%; background:url(x)",
      typeface: "'; drop table",
    });
    expect(hostile.cornerKey).toBe("square");
    expect(hostile.typefaceKey).toBe("modern");
  });

  it("starts professional businesses on the editorial template", () => {
    expect(defaultAppearanceForVariant("professional").templateKey).toBe(
      "editorial",
    );
    for (const variant of [
      "general",
      "hospitality",
      "trades",
      "wellbeing",
      "retail",
      "professional",
      "community",
    ] as const) {
      const start = defaultAppearanceForVariant(variant);
      expect(start.cornerKey).toBe("soft");
      expect(start.typefaceKey).toBe("classic");
    }
  });

  it("builds only approved values into the site's theme", () => {
    const theme = businessSiteTheme({
      templateKey: "editorial",
      accentKey: "dragon-red",
      cornerKey: "round",
      typefaceKey: "modern",
    });
    expect(theme.attributes).toEqual({
      "data-template": "editorial",
      "data-corners": "round",
      "data-typeface": "modern",
    });
    expect(theme.style).toMatchObject({ "--business-primary": "#b0261c" });
  });
});
