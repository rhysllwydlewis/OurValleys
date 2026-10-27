import { parsePage } from "./directory-filters";

/**
 * One description of the `/updates` page's URL state, so the search form,
 * the filter chips, the category rail and pagination cannot drop a filter
 * another one set.
 */
export type UpdateFilters = {
  q: string;
  category: string;
  place: string;
  page: number;
};

export type RawUpdateParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseUpdateFilters(params: RawUpdateParams): UpdateFilters {
  return {
    q: first(params.q).trim().slice(0, 80),
    category: first(params.category).slice(0, 80),
    place: first(params.place).slice(0, 80),
    page: parsePage(first(params.page)),
  };
}

export function updateHref(
  filters: Partial<UpdateFilters>,
  overrides: Partial<UpdateFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.place) params.set("place", merged.place);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  const query = params.toString();
  return query ? `/updates?${query}` : "/updates";
}

export function hasUpdateFilters(filters: UpdateFilters): boolean {
  return Boolean(filters.q || filters.category || filters.place);
}
