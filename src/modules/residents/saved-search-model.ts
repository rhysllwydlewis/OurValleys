import { foldText, normaliseSiteQuery } from "@/modules/search/match";
import {
  parseSearchType,
  searchHref,
  type SearchType,
} from "@/modules/search/search-filters";

/** Keeps the list useful and the live "what is new" counting cheap. */
export const MAX_SAVED_SEARCHES = 10;

export type SavedSearchInput = {
  query: string;
  queryKey: string;
  type: SearchType;
};

/** Reads untrusted form values; null when there is nothing worth keeping. */
export function parseSavedSearchInput(
  rawQuery: unknown,
  rawType: unknown,
): SavedSearchInput | null {
  if (typeof rawQuery !== "string") return null;
  const query = normaliseSiteQuery(rawQuery);
  if (!query) return null;
  const queryKey = foldText(query);
  if (queryKey.length < 2) return null;
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

export function savedSearchHref(input: {
  query: string;
  type: SearchType;
}): string {
  return searchHref({ q: input.query, type: input.type });
}

/** True when the page being viewed is already one of the saved searches. */
export function isSavedSearch(
  saved: ReadonlyArray<{ queryKey: string; type: string }>,
  input: { queryKey: string; type: SearchType },
): boolean {
  return saved.some(
    (item) => item.queryKey === input.queryKey && item.type === input.type,
  );
}
