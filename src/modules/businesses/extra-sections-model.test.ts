import { describe, expect, it } from "vitest";
import { categorySectionTypes } from "./content-features";
import {
  cleanEntryUrl,
  derivedEntryId,
  describeExtraSectionGuidance,
  entryToLine,
  extraSectionKinds,
  extraSectionTypes,
  faqPairs,
  isSectionWelsh,
  localiseSections,
  maxEntriesPerSection,
  parseExtraSectionForm,
  publicExtraSections,
  recommendedSectionTypes,
  reorderSectionIds,
  splitPriceMeta,
  type ExtraSectionShape,
} from "./extra-sections-model";
import { buildFaqJsonLd, serializeJsonLd } from "@/lib/structured-data";

function form(fields: Record<string, string | string[]>) {
  return {
    get: (name: string) => {
      const value = fields[name];
      return Array.isArray(value) ? value[0] : (value ?? null);
    },
    getAll: (name: string) => {
      const value = fields[name];
      return Array.isArray(value) ? value : value === undefined ? [] : [value];
    },
  };
}

const section = (
  id: string,
  sectionType: ExtraSectionShape["sectionType"],
  entries: ExtraSectionShape["entries"],
  status = "active",
): ExtraSectionShape => ({ id, sectionType, title: id, entries, status });

describe("section types", () => {
  it("agree with the types the database accepts", () => {
    expect([...extraSectionTypes].sort()).toEqual(
      [...categorySectionTypes].sort(),
    );
  });

  it("describe every type's fields and presentation", () => {
    for (const type of extraSectionTypes) {
      const kind = extraSectionKinds[type];
      expect(kind.titleLabel).toMatch(/^extra\.field\./);
      expect(kind.defaultTitleKey).toBe(`extra.defaultTitle.${type}`);
    }
    expect(extraSectionKinds.faq.presentation).toBe("accordion");
    expect(extraSectionKinds.treatments.metaLabel).not.toBeNull();
    expect(extraSectionKinds.areas_covered.hasDescription).toBe(true);
  });
});

describe("entry ids", () => {
  it("keeps a posted id, repairs bad or repeated ones, and skips types without pages", () => {
    const keep = "22222222-2222-4222-8222-222222222222";
    const result = parseExtraSectionForm(
      form({
        sectionType: "products",
        title: "Shop",
        entryKey: [keep, keep, "nope"],
        entryTitle: ["A", "B", "C"],
      }),
    );
    if (!result.ok) throw new Error("refused");
    const ids = result.section.entries.map((e) => e.id);
    expect(ids[0]).toBe(keep);
    expect(new Set(ids).size).toBe(3);

    const faq = parseExtraSectionForm(
      form({
        sectionType: "faq",
        title: "Questions",
        entryKey: [keep],
        entryTitle: ["Q"],
        entryDescription: ["A"],
      }),
    );
    if (!faq.ok) throw new Error("refused");
    expect(faq.section.entries[0]!.id).toBeUndefined();
  });

  it("replaces an id that is not a valid UUID (it would hide the section)", () => {
    const result = parseExtraSectionForm(
      form({
        sectionType: "products",
        title: "Shop",
        entryKey: ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
        entryTitle: ["A"],
      }),
    );
    if (!result.ok) throw new Error("refused");
    expect(result.section.entries[0]!.id).not.toBe(
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    );
    expect(result.section.entries[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("derives the same id for the same entry and a different one otherwise", () => {
    const a = derivedEntryId("section-1", 0, "Candle");
    expect(a).toBe(derivedEntryId("section-1", 0, "Candle"));
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(a).not.toBe(derivedEntryId("section-1", 1, "Candle"));
    expect(a).not.toBe(derivedEntryId("section-2", 0, "Candle"));
    expect(a).not.toBe(derivedEntryId("section-1", 0, "Soap"));
  });
});

describe("parseExtraSectionForm", () => {
  it("reads rows, tidies spacing and skips empty spare rows", () => {
    const result = parseExtraSectionForm(
      form({
        sectionType: "treatments",
        title: "  Treatments   and prices ",
        entryTitle: ["Massage  ", "", ""],
        entryDescription: ["Line one\r\nline two", "", ""],
        entryMeta: ["60 min · £45", "", ""],
      }),
    );
    expect(result).toEqual({
      ok: true,
      section: {
        sectionType: "treatments",
        title: "Treatments and prices",
        entries: [
          {
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            title: "Massage",
            description: "Line one\nline two",
            meta: "60 min · £45",
          },
        ],
        status: "active",
      },
      pictures: [{ keep: null, remove: false, alt: "" }],
      rows: [0],
    });
  });

  it("refuses a row that has text but no name rather than dropping it", () => {
    expect(
      parseExtraSectionForm(
        form({
          sectionType: "faq",
          title: "Questions",
          entryTitle: ["Open on Sundays?", ""],
          entryDescription: ["Yes", "An answer with no question"],
        }),
      ),
    ).toEqual({ ok: false, problem: "entry_title_missing", row: 2 });
  });

  it("refuses unknown types, short headings, no entries and over-long text", () => {
    expect(
      parseExtraSectionForm(form({ sectionType: "blog", title: "Hello" })),
    ).toEqual({ ok: false, problem: "type" });
    expect(
      parseExtraSectionForm(form({ sectionType: "faq", title: "Q" })),
    ).toEqual({ ok: false, problem: "title" });
    expect(
      parseExtraSectionForm(
        form({ sectionType: "faq", title: "Questions", entryTitle: ["", " "] }),
      ),
    ).toEqual({ ok: false, problem: "no_entries" });
    expect(
      parseExtraSectionForm(
        form({
          sectionType: "faq",
          title: "Questions",
          entryTitle: ["x".repeat(161)],
        }),
      ),
    ).toEqual({ ok: false, problem: "entry_too_long", row: 1 });
    expect(
      parseExtraSectionForm(
        form({
          sectionType: "faq",
          title: "Questions",
          entryTitle: Array.from(
            { length: maxEntriesPerSection + 1 },
            () => "q",
          ),
        }),
      ),
    ).toEqual({ ok: false, problem: "too_many_entries" });
  });

  it("keeps notes and details already stored on area and facility entries", () => {
    const result = parseExtraSectionForm(
      form({
        sectionType: "areas_covered",
        title: "Areas we cover",
        entryTitle: ["Rhondda Fawr", ""],
        entryDescription: ["Mon to Fri", ""],
        entryMeta: ["Free call-out", ""],
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      section: {
        entries: [
          {
            title: "Rhondda Fawr",
            description: "Mon to Fri",
            meta: "Free call-out",
          },
        ],
      },
    });
  });

  it("keeps hidden status and treats anything else as active", () => {
    const base = {
      sectionType: "team",
      title: "The team",
      entryTitle: ["Sam"],
    };
    expect(
      parseExtraSectionForm(form({ ...base, status: "hidden" })),
    ).toMatchObject({
      section: { status: "hidden" },
    });
    expect(
      parseExtraSectionForm(form({ ...base, status: "weird" })),
    ).toMatchObject({
      section: { status: "active" },
    });
  });
});

describe("ordering", () => {
  it("moves one place and stays put at either end", () => {
    expect(reorderSectionIds(["a", "b", "c"], "b", "up")).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(reorderSectionIds(["a", "b", "c"], "a", "up")).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(reorderSectionIds(["a", "b", "c"], "c", "down")).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(reorderSectionIds(["a", "b"], "zzz", "down")).toEqual(["a", "b"]);
  });
});

describe("guidance", () => {
  it("recommends sections by category and falls back for unknown variants", () => {
    expect(recommendedSectionTypes("wellbeing")[0]).toBe("treatments");
    expect(recommendedSectionTypes("trades")).toContain("areas_covered");
    expect(recommendedSectionTypes("nonsense")).toEqual(
      recommendedSectionTypes("general"),
    );
  });

  it("flags thin and unanswered FAQs, unpriced entries and missing roles", () => {
    const guidance = describeExtraSectionGuidance(
      [
        section("faq", "faq", [
          { title: "Q1", description: "A1" },
          { title: "Q2", description: "" },
        ]),
        section("shop", "products", [
          { title: "Cake", description: "", meta: "£4" },
          { title: "Pie", description: "" },
        ]),
        section("crew", "team", [{ title: "Sam", description: "" }]),
      ],
      "retail",
    );
    const codes = guidance.suggestions.map((s) => s.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "thin_faq",
        "add_answers",
        "add_prices",
        "add_roles",
        "add_recommended",
      ]),
    );
    expect(guidance.suggestions).toContainEqual({
      code: "add_prices",
      sectionId: "shop",
      count: 1,
    });
    expect(guidance.entries).toBe(5);
    // Retail recommends products, faq and facilities; only facilities is missing.
    expect(guidance.missingTypes).toEqual(["facilities"]);
  });

  it("ignores hidden sections for quality hints but warns when all are hidden", () => {
    const guidance = describeExtraSectionGuidance(
      [section("faq", "faq", [{ title: "Q", description: "" }], "hidden")],
      "general",
    );
    expect(guidance.suggestions.map((s) => s.code)).toEqual([
      "all_hidden",
      "add_recommended",
    ]);
    expect(guidance.hidden).toBe(1);
  });

  it("has nothing to say about a complete set", () => {
    const guidance = describeExtraSectionGuidance(
      [
        section("faq", "faq", [
          { title: "A", description: "a" },
          { title: "B", description: "b" },
          { title: "C", description: "c" },
        ]),
        section("area", "areas_covered", [{ title: "Cwm", description: "" }]),
        section("crew", "team", [
          { title: "Sam", description: "", meta: "Owner" },
        ]),
      ],
      "general",
    );
    expect(guidance.suggestions).toEqual([]);
  });
});

describe("public data", () => {
  it("shows only active sections and answered questions, dropping empty ones", () => {
    const visible = publicExtraSections([
      section("faq", "faq", [
        { title: "Open Sundays?", description: "Yes." },
        { title: "Unanswered?", description: "" },
      ]),
      section("empty-faq", "faq", [{ title: "Nothing?", description: "" }]),
      section("hidden", "team", [{ title: "Sam", description: "" }], "hidden"),
      section("areas", "areas_covered", [{ title: "Cwm", description: "" }]),
    ]);
    expect(visible.map((s) => s.id)).toEqual(["faq", "areas"]);
    expect(visible[0]!.entries).toEqual([
      { title: "Open Sundays?", description: "Yes." },
    ]);
  });

  it("builds FAQ pairs only from active, answered questions", () => {
    expect(
      faqPairs([
        section("a", "faq", [
          { title: "Open Sundays?", description: "Yes, 10 to 4." },
          { title: "Unanswered?", description: "" },
        ]),
        section(
          "b",
          "faq",
          [{ title: "Hidden?", description: "Yes" }],
          "hidden",
        ),
        section("c", "team", [{ title: "Sam", description: "Owner" }]),
      ]),
    ).toEqual([{ question: "Open Sundays?", answer: "Yes, 10 to 4." }]);
    expect(faqPairs([section("a", "faq", [])])).toBeNull();
  });

  it("emits FAQPage data, never for demos or empty lists, and escapes script ends", () => {
    const pairs = [{ question: "Q?", answer: "</script><b>A</b>" }];
    const data = buildFaqJsonLd(pairs);
    expect(data).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Q?",
          acceptedAnswer: { text: "</script><b>A</b>" },
        },
      ],
    });
    expect(serializeJsonLd(data!)).not.toContain("</script>");
    expect(buildFaqJsonLd(pairs, { demo: true })).toBeNull();
    expect(buildFaqJsonLd([])).toBeNull();
    expect(buildFaqJsonLd(null)).toBeNull();
  });

  it("splits a price from its note and keeps text without a price", () => {
    expect(splitPriceMeta("60 minutes · £45")).toEqual({
      price: "£45",
      note: "60 minutes",
    });
    expect(splitPriceMeta("£12.50")).toEqual({ price: "£12.50", note: null });
    expect(splitPriceMeta("from £30 | per hour")).toEqual({
      price: "from £30",
      note: "per hour",
    });
    expect(splitPriceMeta("Ask in store")).toEqual({
      price: null,
      note: "Ask in store",
    });
    expect(splitPriceMeta(undefined)).toEqual({ price: null, note: null });
  });

  it("renders an entry back to the old line format", () => {
    expect(entryToLine({ title: "A", description: "b", meta: "c" })).toBe(
      "A | b | c",
    );
    expect(entryToLine({ title: "A", description: "" })).toBe("A");
  });
});

describe("catalogue entries: availability, links and pictures", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  const base = {
    sectionType: "products",
    title: "Shop",
    entryTitle: ["Candle", "Soap"],
    entryDescription: ["Soy", ""],
    entryMeta: ["£8", ""],
  };

  it("clean web addresses accept only plain https pages", () => {
    expect(cleanEntryUrl(" https://shop.example.co.uk/candles ")).toBe(
      "https://shop.example.co.uk/candles",
    );
    for (const bad of [
      "",
      "http://shop.example.co.uk",
      "javascript:alert(1)",
      "https://user:pass@shop.example.co.uk",
      "https://localhost",
      "not a url",
      `https://shop.example.co.uk/${"a".repeat(300)}`,
    ]) {
      expect(cleanEntryUrl(bad)).toBeNull();
    }
  });

  it("stores featured only when a row asks for it", () => {
    const parsed = parseExtraSectionForm(
      form({ ...base, entryFeatured: ["1", ""] }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.section.entries[0]).toMatchObject({ featured: true });
    expect(parsed.section.entries[1]).not.toHaveProperty("featured");
  });

  it("reads availability, link and picture intent for each row", () => {
    const parsed = parseExtraSectionForm(
      form({
        ...base,
        entryAvailability: ["limited", "available"],
        entryUrl: ["https://shop.example.co.uk/candle", ""],
        entryImageId: [id, ""],
        entryImageAlt: ["A candle", ""],
        removeImageRow: ["1"],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.section.entries[0]).toMatchObject({
      title: "Candle",
      availability: "limited",
      url: "https://shop.example.co.uk/candle",
    });
    // "Available" is the unmarked default and is not stored.
    expect(parsed.section.entries[1]).not.toHaveProperty("availability");
    expect(parsed.pictures).toEqual([
      { keep: id, remove: false, alt: "A candle", altCy: undefined },
      { keep: null, remove: true, alt: "", altCy: undefined },
    ]);
    expect(parsed.rows).toEqual([0, 1]);
  });

  it("reads a Welsh picture description per row, and leaves it alone when the form sends none", () => {
    const sent = parseExtraSectionForm(
      form({
        ...base,
        entryImageId: [id, ""],
        entryImageAlt: ["A candle", ""],
        entryImageAltCy: ["  Cannwyll   fêl ", ""],
      }),
    );
    expect(sent.ok).toBe(true);
    if (!sent.ok) return;
    // Whitespace is collapsed; an empty field is sent as "" so it clears.
    expect(sent.pictures.map((picture) => picture.altCy)).toEqual([
      "Cannwyll fêl",
      "",
    ]);

    const longWelsh = parseExtraSectionForm(
      form({
        ...base,
        entryImageAlt: ["", ""],
        entryImageAltCy: ["w".repeat(500), ""],
      }),
    );
    expect(longWelsh.ok).toBe(true);
    if (!longWelsh.ok) return;
    expect(longWelsh.pictures[0]!.altCy).toHaveLength(300);
  });

  it("refuses an unusable link and names the row", () => {
    expect(
      parseExtraSectionForm(
        form({ ...base, entryUrl: ["", "javascript:alert(1)"] }),
      ),
    ).toEqual({ ok: false, problem: "entry_url_invalid", row: 2 });
  });

  it("ignores links, stock state and pictures a type does not offer", () => {
    const parsed = parseExtraSectionForm(
      form({
        sectionType: "faq",
        title: "Questions",
        entryTitle: ["Why?"],
        entryDescription: ["Because."],
        entryMeta: [""],
        entryUrl: ["https://evil.example.com"],
        entryAvailability: ["sold_out"],
        entryImageId: [id],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.section.entries[0]).toEqual({
      title: "Why?",
      description: "Because.",
    });
    expect(parsed.pictures[0]).toEqual({ keep: null, remove: false, alt: "" });
  });

  it("does not trust a malformed picture id", () => {
    const parsed = parseExtraSectionForm(
      form({ ...base, entryImageId: ["../../etc/passwd", "x"] }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.pictures.map((p) => p.keep)).toEqual([null, null]);
  });

  it("keeps row numbers aligned when a blank row sits between filled ones", () => {
    const parsed = parseExtraSectionForm(
      form({
        sectionType: "team",
        title: "Team",
        entryTitle: ["Ann", "", "Bea"],
        entryDescription: ["", "", ""],
        entryMeta: ["Owner", "", "Stylist"],
        entryImageId: ["", "", ""],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toEqual([0, 2]);
  });
});

describe("Welsh entry text", () => {
  const welshForm = (over: Record<string, unknown[]>) =>
    form({
      sectionType: "products",
      title: "Shop",
      entryTitle: ["Candle", ""],
      entryDescription: ["Soy wax", ""],
      entryMeta: ["£8", ""],
      ...over,
    });

  it("reads and trims a Welsh name and description per row", () => {
    const result = parseExtraSectionForm(
      welshForm({
        entryTitleCy: ["  Cannwyll  ", ""],
        entryDescriptionCy: ["Cwyr soi", ""],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.section.entries[0]).toMatchObject({
      title: "Candle",
      titleCy: "Cannwyll",
      descriptionCy: "Cwyr soi",
    });
  });

  it("stores nothing when the Welsh fields are empty", () => {
    const result = parseExtraSectionForm(welshForm({}));
    if (!result.ok) throw new Error("expected ok");
    expect(result.section.entries[0]).not.toHaveProperty("titleCy");
    expect(result.section.entries[0]).not.toHaveProperty("descriptionCy");
  });

  it("refuses a Welsh description without a Welsh name and over-long Welsh text", () => {
    expect(
      parseExtraSectionForm(welshForm({ entryDescriptionCy: ["Cwyr", ""] })),
    ).toEqual({ ok: false, problem: "entry_welsh_title_missing", row: 1 });
    expect(
      parseExtraSectionForm(welshForm({ entryTitleCy: ["x".repeat(161), ""] })),
    ).toEqual({ ok: false, problem: "entry_too_long", row: 1 });
  });

  it("does not drop a row that only has Welsh text", () => {
    const result = parseExtraSectionForm(
      welshForm({ entryTitle: ["", ""], entryTitleCy: ["Cannwyll", ""] }),
    );
    expect(result).toEqual({
      ok: false,
      problem: "entry_title_missing",
      row: 1,
    });
  });

  it("is Welsh only when every entry is translated", () => {
    expect(isSectionWelsh([])).toBe(false);
    expect(
      isSectionWelsh([
        { title: "A", description: "a", titleCy: "Y", descriptionCy: "y" },
        { title: "B", description: "", titleCy: "Z" },
      ]),
    ).toBe(true);
    expect(
      isSectionWelsh([
        { title: "A", description: "a", titleCy: "Y" },
        { title: "B", description: "", titleCy: "Z" },
      ]),
    ).toBe(false);
    expect(isSectionWelsh([{ title: "A", description: "" }])).toBe(false);
  });

  it("swaps a fully translated list for Welsh readers only", () => {
    const sections = [
      {
        entries: [
          {
            id: "1",
            title: "A",
            description: "a",
            titleCy: "Y",
            descriptionCy: "y",
          },
        ],
      },
      { entries: [{ id: "2", title: "B", description: "b", titleCy: "Z" }] },
    ];
    const cy = localiseSections(sections, "cy");
    expect(cy[0]).toMatchObject({
      welsh: true,
      entries: [{ id: "1", title: "Y", description: "y" }],
    });
    expect(cy[1]).toBe(sections[1]);
    expect(localiseSections(sections, "en")[0]).toBe(sections[0]);
    expect(sections[0]!.entries[0]!.title).toBe("A");
  });

  it("shows a Welsh description even when the English one is empty", () => {
    const [section] = localiseSections(
      [
        {
          entries: [
            { title: "A", description: "", titleCy: "Y", descriptionCy: "y" },
          ],
        },
      ],
      "cy",
    );
    expect(section!.entries[0]!.description).toBe("y");
  });
});
