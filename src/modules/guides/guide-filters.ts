import { foldText } from "@/modules/search/match";

/**
 * URL state and filtering for the guides page, free of the database so it can
 * be tested. Guides are few and already loaded whole, so filtering happens in
 * memory over the published list.
 */

export type GuideListItem = {
  slug: string;
  title: string;
  summary: string;
  area: string;
};

export type GuideFilters = { q: string; area: string };

export type RawGuideParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseGuideFilters(params: RawGuideParams): GuideFilters {
  return {
    q: first(params.q).trim().replace(/\s+/g, " ").slice(0, 80),
    area: first(params.area).trim().slice(0, 80),
  };
}

export function guidesHref(
  filters: GuideFilters,
  overrides: Partial<GuideFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.area) params.set("area", merged.area);
  const query = params.toString();
  return query ? `/guides?${query}` : "/guides";
}

export function hasGuideFilters(filters: GuideFilters): boolean {
  return Boolean(filters.q || filters.area);
}

/** Guides in the chosen area (matched without regard to case) that contain the search words. */
export function filterGuides<T extends GuideListItem>(
  guides: readonly T[],
  filters: GuideFilters,
): T[] {
  const area = foldText(filters.area);
  const words = foldText(filters.q).split(" ").filter(Boolean);
  return guides.filter((guide) => {
    if (area && foldText(guide.area) !== area) return false;
    if (words.length === 0) return true;
    const haystack = foldText(`${guide.title} ${guide.summary} ${guide.area}`);
    return words.every((word) => haystack.includes(word));
  });
}

export type GuideAreaCount = { area: string; count: number };

/** Areas that have guides, most guides first, for the area rail. Ignores the area filter itself. */
export function guideAreaCounts(
  guides: readonly GuideListItem[],
): GuideAreaCount[] {
  const counts = new Map<string, GuideAreaCount>();
  for (const guide of guides) {
    const key = foldText(guide.area);
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { area: guide.area, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.area.localeCompare(b.area, "en-GB"),
  );
}
