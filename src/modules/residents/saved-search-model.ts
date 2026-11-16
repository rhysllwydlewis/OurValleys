import type { MessageKey, Translator } from "@/lib/i18n/translator";
import {
  DIRECTORY_FLAG_FILTERS,
  directoryHref,
  parseDirectoryFilters,
  type DirectoryFilters,
  type DirectoryFlagKey,
} from "@/modules/businesses/directory-filters";
import { eventsHref, parseEventFilters } from "@/modules/events/event-filters";
import { foldText, normaliseSiteQuery } from "@/modules/search/match";
import {
  parseSearchType,
  searchHref,
  type SearchType,
} from "@/modules/search/search-filters";

/** Keeps the list useful and the live "what is new" counting cheap. */
export const MAX_SAVED_SEARCHES = 10;

/** A site search tab, or a filter set kept from the directory or the events page. */
export type SavedSearchType = SearchType | "directory" | "event_filters";

/** Longest stored filter string (the database bounds it too). */
export const MAX_DIRECTORY_QUERY_LENGTH = 200;

export type SavedSearchInput = {
  query: string;
  queryKey: string;
  type: SavedSearchType;
};

export function parseSavedSearchType(value: string): SavedSearchType {
  return value === "directory" || value === "event_filters"
    ? value
    : parseSearchType(value);
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

/**
 * How a kept filter set is put into words. A search is stored as URL slugs, so
 * these turn each one back into what the resident chose.
 */
export type SavedQueryWords = {
  category: (slug: string) => string;
  place: (slug: string) => string;
  near: (slug: string, radiusKm: number) => string;
  flag: (key: DirectoryFlagKey) => string;
  free: string;
  stepFree: string;
};

const unslug = (value: string) => value.replace(/-/g, " ");

/**
 * The fallback when names and messages are not to hand: the slugs themselves,
 * spaced out, and English filter words.
 */
export const plainSavedQueryWords: SavedQueryWords = {
  category: unslug,
  place: unslug,
  near: (slug) => `near ${unslug(slug)}`,
  flag: (key) => key.replace(/([A-Z])/g, " $1").toLowerCase(),
  free: "free",
  stepFree: "step-free",
};

const flagMessageKeys = {
  openNow: "dir.openNow",
  verified: "dir.verifiedOnly",
  accessible: "dir.stepFree",
  welshSpeaking: "dir.welshSpeaking",
  delivery: "dir.delivery",
  collection: "dir.collection",
  emergency: "dir.emergency",
  hearingLoop: "dir.hearingLoop",
  accessibleToilet: "dir.accessibleToilet",
  appointmentRequired: "dir.appointmentRequired",
} as const satisfies Record<DirectoryFlagKey, MessageKey>;

type NamedSlug = { slug: string; name: string };

/**
 * Words in the reader's language, with the real names of the places and
 * categories (the same names the directory and events pages show in their
 * filter chips). A slug with no match, such as a place since retired, falls
 * back to the spaced-out slug.
 */
export function savedQueryWords(
  t: Translator,
  names: {
    places: ReadonlyArray<NamedSlug>;
    categories: ReadonlyArray<NamedSlug>;
  },
): SavedQueryWords {
  const places = new Map(names.places.map((item) => [item.slug, item.name]));
  const categories = new Map(
    names.categories.map((item) => [item.slug, item.name]),
  );
  const place = (slug: string) => places.get(slug) ?? unslug(slug);
  return {
    category: (slug) => categories.get(slug) ?? unslug(slug),
    place,
    near: (slug, radiusKm) =>
      t("dir.chipNear", { value: place(slug), radius: radiusKm }),
    flag: (key) => t(flagMessageKeys[key]),
    free: t("eventsCost.free"),
    stepFree: t("eventsCost.stepFree"),
  };
}

/** A saved directory filter set in words: the values, not the field labels. */
export function describeDirectoryQuery(
  query: string,
  words: SavedQueryWords = plainSavedQueryWords,
): string {
  const filters = parseDirectoryFilters(
    Object.fromEntries(new URLSearchParams(query)),
  );
  const parts = [
    filters.q ? `“${filters.q}”` : "",
    filters.category ? words.category(filters.category) : "",
    filters.place ? words.place(filters.place) : "",
    filters.near ? words.near(filters.near, filters.radius) : "",
    ...DIRECTORY_FLAG_FILTERS.filter(({ key }) => filters[key]).map(({ key }) =>
      words.flag(key),
    ),
  ];
  return parts.filter(Boolean).join(" · ");
}

/**
 * The event filters worth keeping, as the canonical query string, or null when
 * nothing narrows the events. Quick ranges, a picked day, the month view and
 * the page are dropped: they move with the calendar, so keeping them would
 * make a saved search stale or read as new results every morning.
 */
export function canonicalEventQuery(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > MAX_DIRECTORY_QUERY_LENGTH * 2) {
    return null;
  }
  const parsed = parseEventFilters(
    Object.fromEntries(new URLSearchParams(raw)),
  );
  const href = eventsHref({
    q: parsed.q,
    category: parsed.category,
    place: parsed.place,
    near: parsed.near,
    radius: parsed.radius,
    free: parsed.free,
    stepFree: parsed.stepFree,
  });
  const query = href.slice(href.indexOf("?") + 1);
  if (!href.includes("?")) return null;
  return query.length <= MAX_DIRECTORY_QUERY_LENGTH ? query : null;
}

/** A saved event filter set in words: the values, not the field labels. */
export function describeEventQuery(
  query: string,
  words: SavedQueryWords = plainSavedQueryWords,
): string {
  const filters = parseEventFilters(
    Object.fromEntries(new URLSearchParams(query)),
  );
  return [
    filters.q ? `“${filters.q}”` : "",
    filters.category ? words.category(filters.category) : "",
    filters.place ? words.place(filters.place) : "",
    filters.near ? words.near(filters.near, filters.radius) : "",
    filters.free ? words.free : "",
    filters.stepFree ? words.stepFree : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** True for a kept filter set, false for a typed site search. */
export function isFilterSetType(type: SavedSearchType): boolean {
  return type === "directory" || type === "event_filters";
}

/** Any kept filter set in words, or the typed query for a site search. */
export function describeSavedQuery(
  input: { query: string; type: SavedSearchType },
  words: SavedQueryWords = plainSavedQueryWords,
): string {
  if (input.type === "directory") {
    return describeDirectoryQuery(input.query, words);
  }
  if (input.type === "event_filters") {
    return describeEventQuery(input.query, words);
  }
  return input.query;
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
  if (rawType === "event_filters") {
    const events = canonicalEventQuery(rawQuery);
    return events
      ? { query: events, queryKey: events, type: "event_filters" }
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
  if (input.type === "event_filters") return `/events?${input.query}`;
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
