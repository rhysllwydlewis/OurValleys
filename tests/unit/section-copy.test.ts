import { describe, expect, it } from "vitest";
import {
  applyAppearanceDraft,
  businessSections,
  cleanSectionText,
  defaultAppearance,
  defaultAppearanceForVariant,
  normalizeAppearance,
  normalizeSectionCopy,
  parseStoredSectionCopy,
  resolveCategoryVariant,
  sectionCopyLimits,
  sectionCopyView,
  serializeSectionCopy,
  serializeSectionLayouts,
  type BusinessCategoryVariant,
} from "@/modules/businesses/appearance";

const blank = { en: "", cy: "" };

describe("section copy cleaning", () => {
  it("strips control characters and line breaks and collapses white space", () => {
    expect(cleanSectionText("  Our\u0000 story\n\n  so   far\t", 60)).toBe(
      "Our story so far",
    );
    expect(cleanSectionText("a b", 60)).toBe("a b");
  });

  it("cuts to the limit and ignores non-strings", () => {
    expect(cleanSectionText("x".repeat(500), 60)).toHaveLength(60);
    expect(cleanSectionText(42, 60)).toBe("");
    expect(cleanSectionText(null, 60)).toBe("");
  });

  it("keeps markup as inert text for React to escape", () => {
    expect(cleanSectionText("<script>alert(1)</script>", 60)).toBe(
      "<script>alert(1)</script>",
    );
  });
});

describe("normalizeSectionCopy", () => {
  it("keeps only known sections that have some text", () => {
    const copy = normalizeSectionCopy({
      about: { heading: { en: "Our story", cy: "Ein stori" }, intro: {} },
      services: { heading: blank, intro: blank },
      nonsense: { heading: { en: "x" } },
    });
    expect(Object.keys(copy)).toEqual(["about"]);
    expect(copy.about?.heading).toEqual({ en: "Our story", cy: "Ein stori" });
    expect(copy.about?.intro).toEqual(blank);
  });

  it("enforces the per-field limits", () => {
    const copy = normalizeSectionCopy({
      menu: {
        heading: { en: "h".repeat(200) },
        intro: { cy: "i".repeat(1000) },
      },
    });
    expect(copy.menu?.heading.en).toHaveLength(sectionCopyLimits.heading);
    expect(copy.menu?.intro.cy).toHaveLength(sectionCopyLimits.intro);
  });

  it.each([null, undefined, "text", 7, [], [{ about: 1 }]])(
    "returns nothing for %j",
    (value) => {
      expect(normalizeSectionCopy(value)).toEqual({});
    },
  );

  it("drops a damaged section without discarding the others", () => {
    const copy = normalizeSectionCopy({
      about: "broken",
      hours: { heading: { en: "Opening times" } },
    });
    expect(Object.keys(copy)).toEqual(["hours"]);
  });
});

describe("section copy storage", () => {
  const copy = normalizeSectionCopy({
    about: {
      heading: { en: "Our story", cy: "Ein stori" },
      intro: { en: "Family run: since 1987." },
    },
    menu: { intro: { cy: "Bwyd lleol." } },
  });

  it("round-trips through the text-array encoding, colons included", () => {
    const stored = [
      ...serializeSectionLayouts(defaultAppearance.sectionLayouts),
      ...serializeSectionCopy(copy),
    ];
    expect(parseStoredSectionCopy(stored)).toEqual(copy);
  });

  it("is invisible to layout readers that only know section ids", () => {
    const stored = [
      ...serializeSectionLayouts({
        ...defaultAppearance.sectionLayouts,
        services: "list",
      }),
      ...serializeSectionCopy(copy),
    ];
    const appearance = normalizeAppearance({
      ...defaultAppearance,
      sectionLayouts: stored,
      sectionCopy: parseStoredSectionCopy(stored),
    });
    expect(appearance.sectionLayouts.services).toBe("list");
    expect(appearance.sectionLayouts.about).toBe("split");
    expect(appearance.sectionCopy).toEqual(copy);
  });

  it("ignores malformed, unknown and over-deep entries", () => {
    expect(
      parseStoredSectionCopy([
        "copy.about.heading.en",
        "copy.about.heading.fr:Bonjour",
        "copy.about.title.en:Nope",
        "copy.about.heading.en.extra:Nope",
        "copy.unknown.heading.en:Nope",
        "copy..heading.en:Nope",
        42,
        "layout:about",
      ]),
    ).toEqual({});
    expect(parseStoredSectionCopy("not an array")).toEqual({});
    expect(parseStoredSectionCopy(undefined)).toEqual({});
  });

  it("has at most four entries per section, so the column stays small", () => {
    const full = Object.fromEntries(
      businessSections.map((section) => [
        section.id,
        {
          heading: { en: "h".repeat(60), cy: "h".repeat(60) },
          intro: { en: "i".repeat(280), cy: "i".repeat(280) },
        },
      ]),
    );
    const entries = serializeSectionCopy(normalizeSectionCopy(full));
    expect(entries).toHaveLength(businessSections.length * 4);
  });
});

describe("sectionCopyView", () => {
  const copy = normalizeSectionCopy({
    about: {
      heading: { en: "Our story", cy: "Ein stori" },
      intro: { en: "English only." },
    },
    gallery: { heading: { cy: "Lluniau" } },
  });

  it("uses the reader's language without a language mark", () => {
    expect(sectionCopyView(copy, "about", "cy").heading).toEqual({
      text: "Ein stori",
      lang: undefined,
    });
    expect(sectionCopyView(copy, "about", "en").heading).toEqual({
      text: "Our story",
      lang: undefined,
    });
  });

  it("falls back to the other language and marks it as such", () => {
    expect(sectionCopyView(copy, "about", "cy").intro).toEqual({
      text: "English only.",
      lang: "en-GB",
    });
    expect(sectionCopyView(copy, "gallery", "en").heading).toEqual({
      text: "Lluniau",
      lang: "cy",
    });
  });

  it("returns nothing for a section with no words", () => {
    expect(sectionCopyView(copy, "hours", "en")).toEqual({
      heading: null,
      intro: null,
    });
    expect(sectionCopyView({}, "about", "cy")).toEqual({
      heading: null,
      intro: null,
    });
  });
});

describe("draft section copy for the live preview", () => {
  const saved = normalizeAppearance({
    ...defaultAppearance,
    sectionCopy: { about: { heading: { en: "Saved" } } },
  });

  it("keeps the saved copy when the address carries none", () => {
    expect(applyAppearanceDraft(saved, {}).sectionCopy).toEqual(
      saved.sectionCopy,
    );
  });

  it("applies unsaved copy, cleaned, and an empty object clears it", () => {
    const draft = applyAppearanceDraft(saved, {
      copy: JSON.stringify({
        hours: { heading: { en: "Open\nlate" }, bogus: 1 },
        unknown: { heading: { en: "x" } },
      }),
    });
    expect(Object.keys(draft.sectionCopy)).toEqual(["hours"]);
    expect(draft.sectionCopy.hours?.heading.en).toBe("Open late");
    expect(applyAppearanceDraft(saved, { copy: "{}" }).sectionCopy).toEqual({});
  });

  it("keeps the saved copy for invalid JSON or an oversized value", () => {
    expect(
      applyAppearanceDraft(saved, { copy: "{not json" }).sectionCopy,
    ).toEqual(saved.sectionCopy);
    expect(
      applyAppearanceDraft(saved, {
        copy: JSON.stringify({ about: { heading: { en: "x".repeat(13000) } } }),
      }).sectionCopy,
    ).toEqual(saved.sectionCopy);
  });
});

describe("category-led starting designs", () => {
  const variants: BusinessCategoryVariant[] = [
    "general",
    "hospitality",
    "trades",
    "wellbeing",
    "retail",
    "professional",
    "community",
  ];

  it.each(variants)(
    "%s lists every section exactly once and passes validation",
    (variant) => {
      const design = defaultAppearanceForVariant(variant);
      const ids = businessSections.map((section) => section.id);
      expect([...design.sectionOrder].sort()).toEqual([...ids].sort());
      expect(design.hiddenSections).toEqual([]);
      expect(design.sectionCopy).toEqual({});
      expect(normalizeAppearance(design)).toEqual(design);
    },
  );

  it("leads with what each kind of business is visited for", () => {
    expect(
      defaultAppearanceForVariant("hospitality").sectionOrder.slice(0, 2),
    ).toEqual(["about", "menu"]);
    expect(defaultAppearanceForVariant("trades").sectionOrder[0]).toBe(
      "services",
    );
    expect(defaultAppearanceForVariant("retail").sectionOrder[0]).toBe(
      "gallery",
    );
  });

  it("keeps the general variant identical to the long-standing default", () => {
    expect(defaultAppearanceForVariant("general")).toEqual(
      normalizeAppearance(defaultAppearance),
    );
  });

  it("maps real category names onto distinct designs", () => {
    const cafe = defaultAppearanceForVariant(
      resolveCategoryVariant("Cafés and restaurants"),
    );
    const plumber = defaultAppearanceForVariant(
      resolveCategoryVariant("Plumbing and heating"),
    );
    expect(cafe.sectionOrder).not.toEqual(plumber.sectionOrder);
    expect(cafe.templateKey).not.toBe(plumber.templateKey);
  });
});
