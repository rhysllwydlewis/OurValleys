import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import { listPublicEvents, type PublicEvent } from "@/modules/events/public";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";
import { escapeLikePattern, matchesFolded, normaliseSiteQuery } from "./match";

/** Items shown per content type; each section links on to its own directory. */
export const SITE_SEARCH_SECTION_LIMIT = 6;

export type SiteSearchPlace = { slug: string; name: string };
export type SiteSearchCategory = { slug: string; name: string };
export type SiteSearchGuide = {
  slug: string;
  title: string;
  summary: string;
  area: string;
  readingTime: string;
};

export type SiteSearchResult =
  | { state: "idle" }
  | { state: "unavailable"; query: string }
  | {
      state: "ready";
      query: string;
      businesses: { items: PublicBusinessSummary[]; total: number };
      events: { items: PublicEvent[]; total: number };
      places: SiteSearchPlace[];
      categories: SiteSearchCategory[];
      guides: SiteSearchGuide[];
      total: number;
    };

async function searchGuides(query: string): Promise<SiteSearchGuide[] | null> {
  const pattern = `%${escapeLikePattern(query)}%`;
  try {
    return await getDatabase()
      .select({
        slug: guide.slug,
        title: guide.title,
        summary: guide.summary,
        area: guide.areaLabel,
        readingTime: guide.readingTime,
      })
      .from(guide)
      .where(
        and(
          eq(guide.status, "published"),
          or(
            ilike(guide.title, pattern),
            ilike(guide.summary, pattern),
            ilike(guide.areaLabel, pattern),
          ),
        ),
      )
      .orderBy(desc(guide.publishedAt))
      .limit(SITE_SEARCH_SECTION_LIMIT);
  } catch {
    return null;
  }
}

/**
 * One search across the public, published content types. It composes the
 * existing public read paths (directory, events, active places and
 * categories, published guides) so it can never surface a draft, suspended or
 * private record that those paths already hide. Business and event search
 * degrade independently: only when every source fails is the page
 * "unavailable".
 */
export async function searchSite(
  rawQuery: string | null | undefined,
): Promise<SiteSearchResult> {
  const query = normaliseSiteQuery(rawQuery);
  if (!query) return { state: "idle" };

  const [businessResult, eventResult, places, categories, guides] =
    await Promise.all([
      listPublishedBusinesses({
        query,
        pageSize: SITE_SEARCH_SECTION_LIMIT,
      }),
      listPublicEvents({ query, pageSize: SITE_SEARCH_SECTION_LIMIT }),
      listActivePlaces(),
      listActiveCategories(),
      searchGuides(query),
    ]);

  if (
    businessResult.state === "unavailable" &&
    eventResult.state === "unavailable" &&
    guides === null
  ) {
    return { state: "unavailable", query };
  }

  const matchedPlaces = places
    .filter((item) => matchesFolded([item.name, item.welshName], query))
    .slice(0, SITE_SEARCH_SECTION_LIMIT)
    .map(({ slug, name }) => ({ slug, name }));
  const matchedCategories = categories
    .filter((item) => matchesFolded([item.name, item.welshLabel], query))
    .slice(0, SITE_SEARCH_SECTION_LIMIT)
    .map(({ slug, name }) => ({ slug, name }));

  const businesses = {
    items: businessResult.businesses,
    total: businessResult.total,
  };
  const events = { items: eventResult.events, total: eventResult.total };
  const guideItems = guides ?? [];

  return {
    state: "ready",
    query,
    businesses,
    events,
    places: matchedPlaces,
    categories: matchedCategories,
    guides: guideItems,
    total:
      businesses.items.length +
      events.items.length +
      matchedPlaces.length +
      matchedCategories.length +
      guideItems.length,
  };
}
