import {
  categoryKey,
  groupEntriesByCategory,
  hasEntryPage,
  localiseSections,
  splitPriceMeta,
  type ExtraEntry,
  type ExtraSectionShape,
} from "./extra-sections-model";

/**
 * Pure rules for the page of one catalogue entry (a product, a treatment or a
 * team member). No database or framework imports.
 */

const idPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEntryId(value: string): boolean {
  return idPattern.test(value);
}

export const maxSiblingsShown = 6;

/**
 * Finds the entry in the sections a visitor can see. Hidden sections are not
 * passed in by the caller, and only the types that have entry pages match, so
 * an id of a question or a facility is simply "not found".
 */
export function findCatalogueEntry<
  S extends ExtraSectionShape & { entries: readonly ExtraEntry[] },
>(
  sections: readonly S[],
  entryId: string,
): {
  section: S;
  entry: S["entries"][number];
  /** The other entries of the same list, in the owner's order. */
  siblings: Array<S["entries"][number]>;
} | null {
  const wanted = entryId.toLowerCase();
  for (const section of sections) {
    if (!hasEntryPage(section.sectionType)) continue;
    const entry = section.entries.find((item) => item.id === wanted);
    if (!entry) continue;
    return {
      section,
      entry,
      siblings: section.entries
        .filter((item) => item !== entry)
        .slice(0, maxSiblingsShown),
    };
  }
  return null;
}

/**
 * The same page for a Welsh reader: the list the entry sits in is swapped to
 * the owner's Welsh text when it is fully translated (see `localiseSections`).
 * The entry is looked up again by id in the swapped list, so the entry,
 * its siblings and the list's `welsh` flag all agree.
 */
export function localiseCataloguePage<
  S extends ExtraSectionShape & {
    entries: readonly ExtraEntry[];
    welsh?: boolean | undefined;
  },
>(
  page: { section: S; entry: S["entries"][number] },
  locale: string,
): {
  section: S;
  entry: S["entries"][number];
  siblings: Array<S["entries"][number]>;
} {
  const [section] = localiseSections([page.section], locale) as [S];
  const found = findCatalogueEntry([section], page.entry.id ?? "");
  // The id came from this very list, so the lookup cannot miss; falling back
  // keeps the page rendering the original if it somehow did.
  return (
    found ?? {
      section: page.section,
      entry: page.entry,
      siblings: page.section.entries
        .filter((item) => item !== page.entry)
        .slice(0, maxSiblingsShown),
    }
  );
}

/** "£12.50" style prices that structured data may state as a number. */
export function structuredPrice(meta: string | undefined): string | null {
  const { price } = splitPriceMeta(meta);
  const match = /^£\s?(\d{1,5}(?:\.\d{2})?)$/.exec(price ?? "");
  return match ? match[1]! : null;
}

export function entryPagePath(
  slug: string,
  entryId: string,
): `/b/${string}/catalogue/${string}` {
  return `/b/${slug}/catalogue/${entryId}`;
}

/* ------------------------------------------------------------------ */
/* The combined catalogue page                                         */
/* ------------------------------------------------------------------ */

export const catalogueTypes = ["products", "treatments", "team"] as const;
export type CatalogueType = (typeof catalogueTypes)[number];

export const maxSearchLength = 80;
/** Items drawn on one page; a business holds at most 12 lists of 50. */
export const maxCatalogueItems = 200;

export const catalogueSorts = [
  "owner",
  "featured",
  "name",
  "price_asc",
  "price_desc",
] as const;
export type CatalogueSort = (typeof catalogueSorts)[number];

export type CatalogueFilters = {
  q: string;
  type: CatalogueType | null;
  /** The folded category key, or null for every category. */
  category: string | null;
  inStockOnly: boolean;
  /** Show only entries the owner marked as featured. */
  featuredOnly: boolean;
  /** How entries are ordered inside each category; the owner's order by default. */
  sort: CatalogueSort;
};

type RawParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function isCatalogueType(value: string): value is CatalogueType {
  return (catalogueTypes as readonly string[]).includes(value);
}

function isCatalogueSort(value: string): value is CatalogueSort {
  return (catalogueSorts as readonly string[]).includes(value);
}

/** Reads the page's query string. Anything unrecognised is ignored, never an error. */
export function parseCatalogueFilters(params: RawParams): CatalogueFilters {
  const q = firstValue(params.q)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxSearchLength);
  const type = firstValue(params.type);
  const category = categoryKey(firstValue(params.category).slice(0, 120));
  const sort = firstValue(params.sort);
  return {
    q,
    type: isCatalogueType(type) ? type : null,
    category: category || null,
    inStockOnly: firstValue(params.stock) === "1",
    featuredOnly: firstValue(params.featured) === "1",
    sort: isCatalogueSort(sort) ? sort : "owner",
  };
}

/** Whether any filter is narrowing the list. */
export function hasActiveFilters(filters: CatalogueFilters): boolean {
  return Boolean(
    filters.q ||
    filters.type ||
    filters.category ||
    filters.inStockOnly ||
    filters.featuredOnly,
  );
}

/**
 * The number in an entry's price ("£12.50", "from £8", "50p"), or null when it
 * states none, so the entry sorts after every priced one.
 */
export function sortablePrice(meta: string | undefined): number | null {
  const { price } = splitPriceMeta(meta);
  if (!price) return null;
  const pence = /(\d+(?:[.,]\d+)?)\s?p\b/.exec(price);
  if (pence && !/[£€$]\s?\d/.test(price)) {
    return Number(pence[1]!.replace(",", ".")) / 100;
  }
  const match = /[£€$]\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/.exec(
    price,
  );
  return match ? Number(match[1]!.replace(/,/g, "")) : null;
}

/** Orders entries by the chosen sort; stable, so ties keep the owner's order. */
export function sortCatalogueEntries<E extends ExtraEntry>(
  entries: readonly E[],
  sort: CatalogueSort,
): E[] {
  const list = [...entries];
  if (sort === "owner") return list;
  const withIndex = list.map((entry, position) => ({ entry, position }));
  const priceOf = (entry: E) => sortablePrice(entry.meta);
  withIndex.sort((a, b) => {
    let order = 0;
    if (sort === "featured") {
      order =
        Number(Boolean(b.entry.featured)) - Number(Boolean(a.entry.featured));
    } else if (sort === "name") {
      order = fold(a.entry.title).localeCompare(fold(b.entry.title), "en-GB");
    } else {
      const left = priceOf(a.entry);
      const right = priceOf(b.entry);
      if (left === null || right === null) {
        order = left === right ? 0 : left === null ? 1 : -1;
      } else {
        order = sort === "price_asc" ? left - right : right - left;
      }
    }
    return order || a.position - b.position;
  });
  return withIndex.map((item) => item.entry);
}

/** Lower-cased with accents removed, so "cafe" finds "Café" and "ty" finds "Tŷ". */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-GB");
}

export type CatalogueItem<S, E> = {
  section: S;
  entry: E;
  type: CatalogueType;
};

export type CatalogueSectionResult<S, E> = {
  section: S;
  type: CatalogueType;
  groups: Array<{ category: string | null; entries: E[] }>;
  count: number;
};

export type CatalogueIndex<S, E> = {
  /** Every item the visitor can see, before filtering. */
  total: number;
  /** Items left after filtering. */
  shown: number;
  sections: Array<CatalogueSectionResult<S, E>>;
  /** Choices for the filters, counted over the whole catalogue. */
  types: Array<{ type: CatalogueType; count: number }>;
  categories: Array<{ key: string; name: string; count: number }>;
  /** Entries the owner marked as featured, before filtering. */
  featuredCount: number;
  /** True when more items exist than one page draws. */
  truncated: boolean;
};

/**
 * Builds the catalogue page from the sections a visitor can see: every entry
 * of a products, treatments or team list, filtered and grouped by list and
 * category in the owner's order. Entries without an id are left out because
 * the page links to each one.
 */
export function buildCatalogueIndex<
  S extends ExtraSectionShape & { entries: readonly ExtraEntry[] },
>(
  sections: readonly S[],
  filters: CatalogueFilters,
): CatalogueIndex<S, S["entries"][number]> {
  type E = S["entries"][number];
  const terms = fold(filters.q).split(" ").filter(Boolean);
  const typeCounts = new Map<CatalogueType, number>();
  const categoryCounts = new Map<
    string,
    { key: string; name: string; count: number }
  >();
  const results: Array<CatalogueSectionResult<S, E>> = [];
  let total = 0;
  let shown = 0;
  let featuredCount = 0;
  for (const section of sections) {
    if (!hasEntryPage(section.sectionType)) continue;
    const type = section.sectionType as CatalogueType;
    const kept: E[] = [];
    for (const entry of section.entries) {
      if (!entry.id) continue;
      total += 1;
      if (entry.featured) featuredCount += 1;
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      const name = entry.category?.trim();
      if (name) {
        const key = categoryKey(name);
        const existing = categoryCounts.get(key);
        if (existing) existing.count += 1;
        else categoryCounts.set(key, { key, name, count: 1 });
      }
      if (filters.type && filters.type !== type) continue;
      if (
        filters.category &&
        categoryKey(entry.category ?? "") !== filters.category
      ) {
        continue;
      }
      if (filters.inStockOnly && entry.availability === "sold_out") continue;
      if (filters.featuredOnly && !entry.featured) continue;
      if (terms.length > 0) {
        const haystack = fold(
          [
            entry.title,
            entry.description,
            entry.meta,
            entry.category,
            section.title,
          ]
            .filter(Boolean)
            .join(" "),
        );
        if (!terms.every((term) => haystack.includes(term))) continue;
      }
      kept.push(entry);
    }
    if (kept.length > 0) {
      results.push({
        section,
        type,
        groups: groupEntriesByCategory(
          sortCatalogueEntries(kept, filters.sort),
        ),
        count: kept.length,
      });
      shown += kept.length;
    }
  }
  // A page never draws more than the cap; later items are dropped whole.
  let budget = maxCatalogueItems;
  const capped: Array<CatalogueSectionResult<S, E>> = [];
  for (const result of results) {
    if (budget <= 0) break;
    if (result.count <= budget) {
      capped.push(result);
      budget -= result.count;
      continue;
    }
    let remaining = budget;
    const groups = result.groups.flatMap((group) => {
      if (remaining <= 0) return [];
      const entries = group.entries.slice(0, remaining);
      remaining -= entries.length;
      return [{ category: group.category, entries }];
    });
    capped.push({ ...result, groups, count: budget });
    budget = 0;
  }
  return {
    total,
    shown,
    sections: capped,
    types: catalogueTypes.flatMap((type) => {
      const count = typeCounts.get(type);
      return count ? [{ type, count }] : [];
    }),
    categories: [...categoryCounts.values()],
    featuredCount,
    truncated: shown > maxCatalogueItems,
  };
}
