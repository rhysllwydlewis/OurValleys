import {
  DIRECTORY_FLAG_FILTERS,
  directoryHref,
  parseDirectoryFilters,
  type DirectoryFilters,
} from "@/modules/businesses/directory-filters";
import { foldText, normaliseSiteQuery } from "@/modules/search/match";
import {
  parseSearchType,
  searchHref,
  type SearchType,
} from "@/modules/search/search-filters";

/** Keeps the list useful and the live "what is new" counting cheap. */
export const MAX_SAVED_SEARCHES = 10;

/** A site search tab, or the business directory's filter set. */
export type SavedSearchType = SearchType | "directory";

/** Longest stored directory filter string (the database bounds it too). */
export const MAX_DIRECTORY_QUERY_LENGTH = 200;

export type SavedSearchInput = {
  query: string;
  queryKey: string;
  type: SavedSearchType;
};

export function parseSavedSearchType(value: string): SavedSearchType {
  return value === "directory" ? "directory" : parseSearchType(value);
}

/**
 * The directory filters worth keeping, as the canonical query string, or null
 * when nothing narrows the directory. "Open now" is dropped (its count changes
 * through the day, so it would read as new results every morning), and sort
 * and page are dropped (they do not change which businesses match).
 */
export function canonicalDirectoryQuery(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > MAX_DIRECTORY_QUERY_LENGTH * 2) {
    return null;
  }
  const parsed = parseDirectoryFilters(
    Object.fromEntries(new URLSearchParams(raw)),
  );
  const filters: DirectoryFilters = {
    ...parsed,
    openNow: false,
    sort: "relevance",
    page: 1,
  };
  const hasFilter =
    filters.q ||
    filters.category ||
    filters.place ||
    filters.near ||
    DIRECTORY_FLAG_FILTERS.some(({ key }) => filters[key]);
  if (!hasFilter) return null;
  const href = directoryHref(filters);
  const query = href.slice(href.indexOf("?") + 1);
  return query.length <= MAX_DIRECTORY_QUERY_LENGTH ? query : null;
}

/** Plain words for a saved directory filter set: the values, not the labels. */
export function describeDirectoryQuery(query: string): string {
  const filters = parseDirectoryFilters(
    Object.fromEntries(new URLSearchParams(query)),
  );
  const unslug = (value: string) => value.replace(/-/g, " ");
  const parts = [
    filters.q ? `“${filters.q}”` : "",
    unslug(filters.category),
    unslug(filters.place),
    filters.near ? `near ${unslug(filters.near)}` : "",
    ...DIRECTORY_FLAG_FILTERS.filter(({ key }) => filters[key]).map(({ key }) =>
      key.replace(/([A-Z])/g, " $1").toLowerCase(),
    ),
  ];
  return parts.filter(Boolean).join(" · ");
}

/** Reads untrusted form values; null when there is nothing worth keeping. */
export function parseSavedSearchInput(
  rawQuery: unknown,
  rawType: unknown,
): SavedSearchInput | null {
  if (typeof rawQuery !== "string") return null;
  if (rawType === "directory") {
    const directory = canonicalDirectoryQuery(rawQuery);
    return directory
      ? { query: directory, queryKey: directory, type: "directory" }
      : null;
  }
  const query = normaliseSiteQuery(rawQuery);
  if (!query) return null;
  const queryKey = foldText(query);
  // The database bounds the key in characters, and folding can lengthen text.
  if ([...queryKey].length < 2 || [...queryKey].length > 80) return null;
  return {
    query,
    queryKey,
    type: parseSearchType(typeof rawType === "string" ? rawType : ""),
  };
}

/** Results now compared with when the resident last looked; never negative. */
export function newResultCount(current: number, lastSeen: number): number {
  return Math.max(0, Math.floor(current) - Math.floor(lastSeen));
}

/**
 * Results an alert email would announce: those beyond both what the resident
 * last looked at and what an earlier alert already covered; never negative.
 */
export function alertableNewCount(
  current: number,
  lastSeen: number,
  alerted: number | null,
): number {
  return newResultCount(current, Math.max(lastSeen, alerted ?? 0));
}

export function savedSearchHref(input: {
  query: string;
  type: SavedSearchType;
}): string {
  if (input.type === "directory") return `/businesses?${input.query}`;
  return searchHref({ q: input.query, type: input.type });
}

/** True when the page being viewed is already one of the saved searches. */
export function isSavedSearch(
  saved: ReadonlyArray<{ queryKey: string; type: string }>,
  input: { queryKey: string; type: SavedSearchType },
): boolean {
  return saved.some(
    (item) => item.queryKey === input.queryKey && item.type === input.type,
  );
}
