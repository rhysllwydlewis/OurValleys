import { foldText } from "@/modules/search/match";

/**
 * The categories page's state and ordering, kept free of the database so it can
 * be tested. The page reads its URL through `parseCategoryFilters`, links back
 * through `categoriesHref`, and shows what `selectCategories` returns.
 */

export type CategoryEntry = {
  slug: string;
  name: string;
  welshLabel: string | null;
  description: string;
  /** Published businesses whose main category this is. */
  businesses: number;
};

export type CategorySort = "most" | "az";

export type CategoryFilters = {
  q: string;
  /** Hide categories with no published businesses. */
  listed: boolean;
  sort: CategorySort;
};

export type RawCategoryParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseCategoryFilters(
  params: RawCategoryParams,
): CategoryFilters {
  return {
    q: first(params.q).trim().replace(/\s+/g, " ").slice(0, 80),
    listed: first(params.listed) === "1",
    sort: first(params.sort) === "az" ? "az" : "most",
  };
}

export function categoriesHref(
  filters: CategoryFilters,
  overrides: Partial<CategoryFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.listed) params.set("listed", "1");
  if (merged.sort === "az") params.set("sort", "az");
  const query = params.toString();
  return query ? `/categories?${query}` : "/categories";
}

export function hasCategoryFilters(filters: CategoryFilters): boolean {
  return Boolean(filters.q || filters.listed);
}

/** Categories that match the search and the "listed only" switch, in the chosen order. */
export function selectCategories(
  entries: readonly CategoryEntry[],
  filters: CategoryFilters,
): CategoryEntry[] {
  const needle = foldText(filters.q);
  const matching = entries.filter((entry) => {
    if (filters.listed && entry.businesses === 0) return false;
    if (!needle) return true;
    return [entry.name, entry.welshLabel, entry.description].some(
      (text) => text && foldText(text).includes(needle),
    );
  });
  return [...matching].sort((a, b) =>
    filters.sort === "az"
      ? a.name.localeCompare(b.name, "en-GB")
      : b.businesses - a.businesses || a.name.localeCompare(b.name, "en-GB"),
  );
}

export type CategoryStats = {
  categories: number;
  withBusinesses: number;
  businesses: number;
};

export function categoryStats(
  entries: readonly CategoryEntry[],
): CategoryStats {
  return {
    categories: entries.length,
    withBusinesses: entries.filter((entry) => entry.businesses > 0).length,
    businesses: entries.reduce((sum, entry) => sum + entry.businesses, 0),
  };
}

/** The most listed categories, for the shortcuts above the grid. Needs at least one business. */
export function popularCategories(
  entries: readonly CategoryEntry[],
  limit = 6,
): CategoryEntry[] {
  return entries
    .filter((entry) => entry.businesses > 0)
    .sort(
      (a, b) =>
        b.businesses - a.businesses || a.name.localeCompare(b.name, "en-GB"),
    )
    .slice(0, limit);
}
