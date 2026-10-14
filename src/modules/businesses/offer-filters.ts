import { parsePage } from "./directory-filters";

/**
 * One description of the offers page's URL state. The page, its filter chips,
 * the category rail, the sort links and pagination all read and write through
 * this module so one of them cannot drop a filter another one set.
 */

export const OFFER_SORTS = ["ending", "newest"] as const;
export type OfferSort = (typeof OFFER_SORTS)[number];
export const DEFAULT_OFFER_SORT: OfferSort = "ending";

/** "Ending this week": offers that finish within this many days. */
export const OFFER_WEEK_DAYS = 7;

export type OfferFilters = {
  q: string;
  category: string;
  place: string;
  /** "week" shows only offers ending within a week. */
  when: "" | "week";
  sort: OfferSort;
  page: number;
};

export type RawOfferParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Reads untrusted query-string values into a normalised filter set. */
export function parseOfferFilters(params: RawOfferParams): OfferFilters {
  const sort = first(params.sort);
  return {
    q: first(params.q).trim().slice(0, 80),
    category: first(params.category).slice(0, 80),
    place: first(params.place).slice(0, 80),
    when: first(params.when) === "week" ? "week" : "",
    sort: (OFFER_SORTS as readonly string[]).includes(sort)
      ? (sort as OfferSort)
      : DEFAULT_OFFER_SORT,
    page: parsePage(first(params.page)),
  };
}

/** The `/offers` URL for a filter set; defaults are left out so URLs stay short. */
export function offerHref(
  filters: Partial<OfferFilters>,
  overrides: Partial<OfferFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.place) params.set("place", merged.place);
  if (merged.when === "week") params.set("when", "week");
  if (merged.sort && merged.sort !== DEFAULT_OFFER_SORT)
    params.set("sort", merged.sort);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  const query = params.toString();
  return query ? `/offers?${query}` : "/offers";
}

/** Any narrowing in force, ignoring sort and page. */
export function hasOfferFilters(filters: OfferFilters): boolean {
  return Boolean(
    filters.q || filters.category || filters.place || filters.when,
  );
}

export type OfferUrgency = "today" | "soon" | "later" | "open";

/** How pressing an offer's end is, for the card's tone. */
export function offerUrgency(daysLeft: number | null): OfferUrgency {
  if (daysLeft === null) return "open";
  if (daysLeft === 0) return "today";
  if (daysLeft <= OFFER_WEEK_DAYS) return "soon";
  return "later";
}
