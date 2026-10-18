import { describe, expect, it } from "vitest";
import { categorySectionTypes } from "./content-features";
import {
  describeExtraSectionGuidance,
  entryToLine,
  extraSectionKinds,
  extraSectionTypes,
  faqPairs,
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
            title: "Massage",
            description: "Line one\nline two",
            meta: "60 min · £45",
          },
        ],
        status: "active",
      },
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
