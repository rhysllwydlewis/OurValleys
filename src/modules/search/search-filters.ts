import { foldText, normaliseSiteQuery } from "./match";

/** What the visitor chose to look at: everything, or one type in full. */
export const SEARCH_TYPES = [
  "all",
  "businesses",
  "offers",
  "events",
  "places",
  "categories",
  "guides",
] as const;

export type SearchType = (typeof SEARCH_TYPES)[number];

export type SearchState = {
  q: string;
  type: SearchType;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Items per page when one type is shown in full. */
export const SEARCH_TYPE_PAGE_SIZE = 12;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseSearchType(value: string): SearchType {
  return (SEARCH_TYPES as readonly string[]).includes(value)
    ? (value as SearchType)
    : "all";
}

export function parseSearchPage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 10_000
    ? parsed
    : 1;
}

/** Reads untrusted query-string values into a normalised state. */
export function parseSearchState(params: RawSearchParams): SearchState {
  return {
    // Keep what was typed (bounded) even when it is too short to search, so
    // the box is not emptied under the visitor's fingers.
    q: first(params.q).trim().replace(/\s+/g, " ").slice(0, 80),
    type: parseSearchType(first(params.type)),
    page: parseSearchPage(first(params.page)),
  };
}

/** The canonical link for a state; defaults are left out to keep URLs short. */
export function searchHref(state: Partial<SearchState>): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.type && state.type !== "all") params.set("type", state.type);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

export type SearchCounts = Record<Exclude<SearchType, "all">, number>;

export type SearchTab = {
  type: SearchType;
  count: number;
  href: string;
  current: boolean;
};

/**
 * The tab rail: "All" first, then each type that has results, in a fixed
 * order. A type with no results is hidden unless it is the one on screen, so
 * the visitor is never offered a dead end but can always see where they are.
 */
export function buildSearchTabs(
  q: string,
  counts: SearchCounts,
  current: SearchType,
): SearchTab[] {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const tabs: SearchTab[] = [
    {
      type: "all",
      count: total,
      href: searchHref({ q }),
      current: current === "all",
    },
  ];
  for (const type of SEARCH_TYPES) {
    if (type === "all") continue;
    const count = counts[type];
    if (count === 0 && current !== type) continue;
    tabs.push({
      type,
      count,
      href: searchHref({ q, type }),
      current: current === type,
    });
  }
  return tabs;
}

export type TopMatchKind = "business" | "place" | "category";

export type TopMatch = {
  kind: TopMatchKind;
  slug: string;
  label: string;
  exact: boolean;
};

type Candidate = { slug: string; labels: ReadonlyArray<string | null> };

const KIND_ORDER: TopMatchKind[] = ["business", "place", "category"];

/**
 * A "best match" is only offered when the visitor has clearly typed a name:
 * the query equals, or is the start of, a business, place or category name
 * (ignoring case and accents). Anything vaguer is left to the ordinary
 * groups, so the panel never second-guesses an open-ended search. Exact
 * matches beat prefixes; businesses beat places beat categories.
 */
export function pickTopMatch(
  rawQuery: string,
  candidates: Record<TopMatchKind, readonly Candidate[]>,
): TopMatch | null {
  const query = normaliseSiteQuery(rawQuery);
  if (!query) return null;
  const needle = foldText(query);
  let prefix: TopMatch | null = null;
  for (const exact of [true, false]) {
    for (const kind of KIND_ORDER) {
      for (const candidate of candidates[kind]) {
        for (const label of candidate.labels) {
          if (!label) continue;
          const folded = foldText(label);
          const hit = exact
            ? folded === needle
            : folded.startsWith(needle) && folded !== needle;
          if (!hit) continue;
          const match = { kind, slug: candidate.slug, label, exact };
          if (exact) return match;
          prefix ??= match;
        }
      }
    }
  }
  return prefix;
}

export const RECENT_SEARCH_LIMIT = 6;

/** Puts a search at the front of the recent list, without duplicates. */
export function addRecentSearch(
  list: readonly string[],
  query: string,
  limit = RECENT_SEARCH_LIMIT,
): string[] {
  const normalised = normaliseSiteQuery(query);
  if (!normalised) return [...list];
  const key = foldText(normalised);
  return [normalised, ...list.filter((item) => foldText(item) !== key)].slice(
    0,
    limit,
  );
}

/** Reads the stored recent list defensively; anything odd becomes empty. */
export function parseRecentSearches(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const cleaned: string[] = [];
    for (const item of value) {
      if (typeof item !== "string") continue;
      const normalised = normaliseSiteQuery(item);
      if (normalised && !cleaned.includes(normalised)) cleaned.push(normalised);
      if (cleaned.length >= RECENT_SEARCH_LIMIT) break;
    }
    return cleaned;
  } catch {
    return [];
  }
}
