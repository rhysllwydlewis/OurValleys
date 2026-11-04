import { describe, expect, it } from "vitest";
import {
  buildCatalogueIndex,
  hasActiveFilters,
  maxCatalogueItems,
  maxSearchLength,
  parseCatalogueFilters,
  sortablePrice,
  sortCatalogueEntries,
} from "./catalogue-page-model";
import {
  categoryKey,
  categoryNames,
  groupEntriesByCategory,
  maxCategoriesPerSection,
  parseExtraSectionForm,
  type ExtraEntry,
  type ExtraSectionShape,
} from "./extra-sections-model";
import { buildCatalogueListJsonLd } from "@/lib/structured-data";

const id = (n: number) =>
  `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const entry = (n: number, extra: Partial<ExtraEntry> = {}): ExtraEntry => ({
  id: id(n),
  title: `Item ${n}`,
  description: "",
  ...extra,
});
const list = (
  sectionType: ExtraSectionShape["sectionType"],
  entries: ExtraEntry[],
  sid: string = sectionType,
) => ({
  id: sid,
  sectionType,
  title: `List ${sid}`,
  status: "active",
  entries,
});
const none = parseCatalogueFilters({});

describe("categories", () => {
  it("folds case and spacing into one group, keeping the first spelling", () => {
    const entries = [
      entry(1, { category: "Cakes" }),
      entry(2, { category: " cakes  " }),
      entry(3, { category: "Bread" }),
      entry(4),
    ];
    expect(categoryKey("  Café  Latte ")).toBe("café latte");
    expect(categoryNames(entries)).toEqual(["Cakes", "Bread"]);
    const groups = groupEntriesByCategory(entries);
    expect(groups.map((g) => [g.category, g.entries.length])).toEqual([
      ["Cakes", 2],
      ["Bread", 1],
      [null, 1],
    ]);
  });
  it("is one ungrouped list when nothing is categorised", () => {
    const groups = groupEntriesByCategory([entry(1), entry(2)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.category).toBeNull();
  });
});

describe("parseExtraSectionForm categories", () => {
  const form = (fields: Record<string, string[]>) => ({
    getAll: (name: string) => fields[name] ?? [],
    get: (name: string) => fields[name]?.[0] ?? null,
  });
  const base = {
    sectionType: ["products"],
    title: ["Shop"],
    entryTitle: ["Loaf", "Bun", ""],
    entryDescription: ["", "", ""],
    entryMeta: ["", "", ""],
  };
  it("reads a category per row and ignores it on types without categories", () => {
    const ok = parseExtraSectionForm(
      form({ ...base, entryCategory: ["  Bread  ", "", ""] }),
    );
    expect(ok.ok && ok.section.entries.map((e) => e.category)).toEqual([
      "Bread",
      undefined,
    ]);
    const team = parseExtraSectionForm(
      form({
        ...base,
        sectionType: ["team"],
        entryCategory: ["Bread", "", ""],
      }),
    );
    expect(team.ok && team.section.entries[0]!.category).toBeUndefined();
  });
  it("refuses a too-long category and too many categories", () => {
    const long = parseExtraSectionForm(
      form({ ...base, entryCategory: ["x".repeat(61), "", ""] }),
    );
    expect(long).toMatchObject({ ok: false, problem: "entry_too_long" });
    const many = Array.from(
      { length: maxCategoriesPerSection + 1 },
      (_, i) => `Group ${i}`,
    );
    const tooMany = parseExtraSectionForm(
      form({
        ...base,
        entryTitle: many.map((_, i) => `Item ${i}`),
        entryDescription: many.map(() => ""),
        entryMeta: many.map(() => ""),
        entryCategory: many,
      }),
    );
    expect(tooMany).toMatchObject({
      ok: false,
      problem: "too_many_categories",
    });
  });
  it("a row with only a category is still an empty spare row", () => {
    const parsed = parseExtraSectionForm(
      form({ ...base, entryCategory: ["", "", "Orphan"] }),
    );
    expect(parsed.ok && parsed.section.entries).toHaveLength(2);
  });
});

describe("parseCatalogueFilters", () => {
  it("cleans free text and ignores unknown values", () => {
    const f = parseCatalogueFilters({
      q: ["  hello\u0000   world ", "second"],
      type: "bogus",
      category: " Café ",
      stock: "yes",
    });
    expect(f).toEqual({
      q: "hello world",
      type: null,
      category: "café",
      inStockOnly: false,
      featuredOnly: false,
      sort: "owner",
    });
    expect(hasActiveFilters(f)).toBe(true);
    expect(hasActiveFilters(none)).toBe(false);
  });
  it("caps the search length and accepts the known values", () => {
    const f = parseCatalogueFilters({
      q: "a".repeat(500),
      type: "treatments",
      stock: "1",
    });
    expect(f.q).toHaveLength(maxSearchLength);
    expect(f.type).toBe("treatments");
    expect(f.inStockOnly).toBe(true);
  });
});

describe("buildCatalogueIndex", () => {
  const sections = [
    list("products", [
      entry(1, { title: "Café mug", category: "Gifts", meta: "£8" }),
      entry(2, {
        title: "Welsh cake",
        category: "Bakery",
        availability: "sold_out",
      }),
      entry(3, { title: "Loaf", category: "bakery", description: "Seeded" }),
    ]),
    list("treatments", [entry(4, { title: "Massage" })]),
    list("faq", [entry(5, { title: "Question?" })]),
    list("team", [{ title: "No id", description: "" }]),
  ];
  it("counts only entries with pages and ids; faq and id-less entries are left out", () => {
    const index = buildCatalogueIndex(sections, none);
    expect(index.total).toBe(4);
    expect(index.shown).toBe(4);
    expect(index.types).toEqual([
      { type: "products", count: 3 },
      { type: "treatments", count: 1 },
    ]);
    expect(index.categories).toEqual([
      { key: "gifts", name: "Gifts", count: 1 },
      { key: "bakery", name: "Bakery", count: 2 },
    ]);
  });
  it("filters by type, category, stock and accent-insensitive text, and keeps facets whole", () => {
    expect(
      buildCatalogueIndex(sections, { ...none, type: "treatments" }).shown,
    ).toBe(1);
    const bakery = buildCatalogueIndex(sections, {
      ...none,
      category: "bakery",
    });
    expect(bakery.shown).toBe(2);
    expect(bakery.categories).toHaveLength(2);
    expect(
      buildCatalogueIndex(sections, { ...none, inStockOnly: true }).shown,
    ).toBe(3);
    expect(
      buildCatalogueIndex(sections, { ...none, q: "cafe" }).sections[0]!
        .groups[0]!.entries[0]!.title,
    ).toBe("Café mug");
    expect(
      buildCatalogueIndex(sections, { ...none, q: "seeded loaf" }).shown,
    ).toBe(1);
    expect(
      buildCatalogueIndex(sections, { ...none, q: "seeded zzz" }).shown,
    ).toBe(0);
  });
  it("matches the list title and detail text", () => {
    expect(buildCatalogueIndex(sections, { ...none, q: "£8" }).shown).toBe(1);
    expect(
      buildCatalogueIndex(sections, { ...none, q: "list treatments" }).shown,
    ).toBe(1);
  });
  it("groups by category inside a list, in owner order", () => {
    const groups = buildCatalogueIndex(sections, none).sections[0]!.groups;
    expect(groups.map((g) => g.category)).toEqual(["Gifts", "Bakery"]);
  });
  it("caps what one page draws and says so", () => {
    const big = list(
      "products",
      Array.from({ length: 50 }, (_, i) => entry(i + 1)),
      "p1",
    );
    const sets = [
      big,
      { ...big, id: "p2" },
      { ...big, id: "p3" },
      { ...big, id: "p4" },
      { ...big, id: "p5" },
    ];
    const index = buildCatalogueIndex(sets, none);
    expect(index.total).toBe(250);
    expect(index.truncated).toBe(true);
    expect(index.sections.reduce((n, s) => n + s.count, 0)).toBe(
      maxCatalogueItems,
    );
  });
  it("returns nothing for no sections", () => {
    const index = buildCatalogueIndex([], none);
    expect(index).toMatchObject({ total: 0, shown: 0, truncated: false });
  });
});

describe("buildCatalogueListJsonLd", () => {
  const input = {
    businessName: "Cwm Bakery",
    path: "/b/cwm/catalogue",
    isDemo: false,
    items: [{ name: "Loaf", path: "/b/cwm/catalogue/x" }],
  };
  it("lists items with absolute urls", () => {
    const ld = buildCatalogueListJsonLd(input, "https://example.test");
    expect(ld).toMatchObject({
      "@type": "ItemList",
      itemListElement: [
        { position: 1, url: "https://example.test/b/cwm/catalogue/x" },
      ],
    });
  });
  it("is silent for demonstrations and empty lists", () => {
    expect(
      buildCatalogueListJsonLd({ ...input, isDemo: true }, "https://e.test"),
    ).toBeNull();
    expect(
      buildCatalogueListJsonLd({ ...input, items: [] }, "https://e.test"),
    ).toBeNull();
  });
});

describe("featured entries and sorting", () => {
  it("reads sort and featured from the query, ignoring anything unknown", () => {
    expect(
      parseCatalogueFilters({ sort: "price_desc", featured: "1" }),
    ).toMatchObject({
      sort: "price_desc",
      featuredOnly: true,
    });
    expect(
      parseCatalogueFilters({ sort: "drop table", featured: "yes" }),
    ).toMatchObject({
      sort: "owner",
      featuredOnly: false,
    });
    expect(hasActiveFilters(parseCatalogueFilters({ featured: "1" }))).toBe(
      true,
    );
    // Sorting alone does not narrow the list.
    expect(hasActiveFilters(parseCatalogueFilters({ sort: "name" }))).toBe(
      false,
    );
  });

  it("reads a number out of the price line", () => {
    expect(sortablePrice("£12.50")).toBe(12.5);
    expect(sortablePrice("from £8 · per week")).toBe(8);
    expect(sortablePrice("£1,200")).toBe(1200);
    expect(sortablePrice("£1200")).toBe(1200);
    expect(sortablePrice("£1000.50")).toBe(1000.5);
    expect(sortablePrice("50p")).toBe(0.5);
    expect(sortablePrice("Ask us")).toBeNull();
    expect(sortablePrice(undefined)).toBeNull();
  });

  const items = [
    entry(1, { title: "Zebra cake", meta: "£20" }),
    entry(2, { title: "apple tart", meta: "£5", featured: true }),
    entry(3, { title: "Éclair" }),
    entry(4, { title: "Bun", meta: "£5" }),
  ];
  const titles = (sorted: ExtraEntry[]) => sorted.map((item) => item.title);

  it("sorts by name ignoring case and accents", () => {
    expect(titles(sortCatalogueEntries(items, "name"))).toEqual([
      "apple tart",
      "Bun",
      "Éclair",
      "Zebra cake",
    ]);
  });

  it("sorts by price with unpriced entries last and ties in owner order", () => {
    expect(titles(sortCatalogueEntries(items, "price_asc"))).toEqual([
      "apple tart",
      "Bun",
      "Zebra cake",
      "Éclair",
    ]);
    expect(titles(sortCatalogueEntries(items, "price_desc"))).toEqual([
      "Zebra cake",
      "apple tart",
      "Bun",
      "Éclair",
    ]);
  });

  it("puts featured first and keeps owner order otherwise", () => {
    expect(titles(sortCatalogueEntries(items, "featured"))[0]).toBe(
      "apple tart",
    );
    expect(titles(sortCatalogueEntries(items, "owner"))).toEqual(titles(items));
  });

  it("filters to featured and counts them before filtering", () => {
    const sections = [list("products", items)];
    const index = buildCatalogueIndex(sections, {
      ...none,
      featuredOnly: true,
    });
    expect(index.shown).toBe(1);
    expect(index.featuredCount).toBe(1);
    expect(index.total).toBe(4);
  });

  it("sorts inside each category group", () => {
    const sections = [
      list("products", [
        entry(1, { title: "B", category: "Cakes" }),
        entry(2, { title: "A", category: "Cakes" }),
      ]),
    ];
    const index = buildCatalogueIndex(sections, { ...none, sort: "name" });
    expect(index.sections[0]!.groups[0]!.entries.map((e) => e.title)).toEqual([
      "A",
      "B",
    ]);
  });

  it("keeps category order when sorting inside groups", () => {
    const sections = [
      list("products", [
        entry(1, { title: "Zebra cake", category: "Cakes" }),
        entry(2, { title: "Apple loaf", category: "Bread" }),
      ]),
    ];
    const index = buildCatalogueIndex(sections, { ...none, sort: "name" });
    expect(index.sections[0]!.groups.map((g) => g.category)).toEqual([
      "Cakes",
      "Bread",
    ]);
  });
});
