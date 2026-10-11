import { parseDirectorySort, type DirectorySort } from "./directory-sort";

/**
 * One description of the business directory's URL state. The page, its filter
 * chips, the sort links, pagination and the map hand-off all read and write
 * through this module so a filter can never be dropped by one of them.
 */

export const RADIUS_OPTIONS_KM = [3, 8, 15, 30] as const;
export const DEFAULT_RADIUS_KM = 8;

/** Yes/no filters, in the order they are shown. `param` is the URL key. */
export const DIRECTORY_FLAG_FILTERS = [
  { key: "openNow", param: "openNow" },
  { key: "verified", param: "verified" },
  { key: "accessible", param: "accessible" },
  { key: "welshSpeaking", param: "welshSpeaking" },
  { key: "delivery", param: "delivery" },
  { key: "collection", param: "collection" },
  { key: "emergency", param: "emergency" },
] as const;

export type DirectoryFlagKey = (typeof DIRECTORY_FLAG_FILTERS)[number]["key"];

export type DirectoryFilters = {
  q: string;
  category: string;
  place: string;
  near: string;
  radius: number;
  sort: DirectorySort;
  page: number;
} & Record<DirectoryFlagKey, boolean>;

export type RawDirectoryParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseRadius(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return (RADIUS_OPTIONS_KM as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_RADIUS_KM;
}

export function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** Reads untrusted query-string values into a normalised filter set. */
export function parseDirectoryFilters(
  params: RawDirectoryParams,
): DirectoryFilters {
  const flags = Object.fromEntries(
    DIRECTORY_FLAG_FILTERS.map(({ key, param }) => [
      key,
      first(params[param]) === "1",
    ]),
  ) as Record<DirectoryFlagKey, boolean>;
  return {
    q: first(params.q).trim().slice(0, 80),
    category: first(params.category).slice(0, 80),
    place: first(params.place).slice(0, 80),
    near: first(params.near).slice(0, 80),
    radius: parseRadius(first(params.radius)),
    sort: parseDirectorySort(first(params.sort)),
    page: parsePage(first(params.page)),
    ...flags,
  };
}

/**
 * The directory URL for a filter set. Defaults (relevance sort, 8km radius,
 * page 1) are omitted so links stay short and canonical. The radius only
 * travels with a "near" place, which is the only thing it applies to.
 */
export function directoryHref(
  filters: Partial<DirectoryFilters>,
  basePath = "/businesses",
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.place) params.set("place", filters.place);
  for (const { key, param } of DIRECTORY_FLAG_FILTERS) {
    if (filters[key]) params.set(param, "1");
  }
  if (filters.near) {
    params.set("near", filters.near);
    if (filters.radius && filters.radius !== DEFAULT_RADIUS_KM) {
      params.set("radius", String(filters.radius));
    }
  }
  if (filters.sort && filters.sort !== "relevance") {
    params.set("sort", filters.sort);
  }
  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** The same filters with some values replaced; changing a filter resets paging. */
export function withFilters(
  filters: DirectoryFilters,
  changes: Partial<DirectoryFilters>,
): Partial<DirectoryFilters> {
  return { ...filters, page: 1, ...changes };
}

export type ActiveFilterKind =
  "q" | "category" | "place" | "near" | DirectoryFlagKey;

/** Filters currently narrowing the results, each with the change that removes it. */
export function activeFilterKinds(
  filters: DirectoryFilters,
): ActiveFilterKind[] {
  const kinds: ActiveFilterKind[] = [];
  if (filters.q) kinds.push("q");
  if (filters.category) kinds.push("category");
  if (filters.place) kinds.push("place");
  if (filters.near) kinds.push("near");
  for (const { key } of DIRECTORY_FLAG_FILTERS) {
    if (filters[key]) kinds.push(key);
  }
  return kinds;
}

export function hrefWithoutFilter(
  filters: DirectoryFilters,
  kind: ActiveFilterKind,
): string {
  const changes: Partial<DirectoryFilters> =
    kind === "near"
      ? { near: "", radius: DEFAULT_RADIUS_KM }
      : kind === "q" || kind === "category" || kind === "place"
        ? { [kind]: "" }
        : { [kind]: false };
  return directoryHref(withFilters(filters, changes));
}

/** Filters held in the collapsible panel (everything but search, category, place). */
export function countAdvancedFilters(filters: DirectoryFilters): number {
  return (
    (filters.near ? 1 : 0) +
    DIRECTORY_FLAG_FILTERS.filter(({ key }) => filters[key]).length
  );
}

/**
 * Compact page list for pagination: always the first, last and current pages
 * with their neighbours; `null` marks a gap.
 */
export function paginationWindow(
  current: number,
  total: number,
): (number | null)[] {
  if (total <= 1) return [];
  const wanted = new Set<number>([1, total, current - 1, current, current + 1]);
  const pages = [...wanted]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (const page of pages) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && page - previous > 1) result.push(null);
    result.push(page);
  }
  return result;
}
