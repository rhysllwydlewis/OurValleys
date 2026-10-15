import "server-only";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import {
  listCategoriesWithPublishedBusinesses,
  listPublishedBusinesses,
  type CategoryWithBusinessCount,
} from "@/modules/businesses/public";
import {
  listPublicOffers,
  type PublicOffer,
} from "@/modules/businesses/public-offers";
import {
  listSearchSuggestions,
  type SearchSuggestion,
} from "@/modules/businesses/search-suggestions";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import { listPublicEvents, type PublicEvent } from "@/modules/events/public";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { loadPlaceTree } from "@/modules/reference-data/place-directory";
import {
  isLocality,
  placeMatchesText,
  type PlaceTree,
} from "@/modules/reference-data/place-tree";
import { escapeLikePattern, matchesFolded, normaliseSiteQuery } from "./match";
import {
  SEARCH_TYPE_PAGE_SIZE,
  pickTopMatch,
  type SearchCounts,
  type SearchType,
  type TopMatch,
} from "./search-filters";

/** Items shown per content type on the "all" view; each links on to its own tab. */
export const SITE_SEARCH_SECTION_LIMIT = 6;

/** The most places, categories or guides one tab will list. */
const LIST_TYPE_LIMIT = 60;

export type SiteSearchPlace = {
  slug: string;
  name: string;
  welshName: string | null;
  /** Published businesses in the place and everything inside it. */
  businesses: number;
};
export type SiteSearchCategory = {
  slug: string;
  name: string;
  welshLabel: string | null;
  /** Published businesses in the category; 0 when none are listed yet. */
  businesses: number;
};
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
      type: SearchType;
      page: number;
      /** Pages in the open tab; 0 when the tab is not paged. */
      totalPages: number;
      counts: SearchCounts;
      businesses: {
        items: PublicBusinessSummary[];
        total: number;
        /** Set when nothing matched the words but a category did. */
        viaCategory: { slug: string; name: string } | null;
      };
      offers: { items: PublicOffer[]; total: number };
      events: { items: PublicEvent[]; total: number };
      places: SiteSearchPlace[];
      categories: SiteSearchCategory[];
      guides: SiteSearchGuide[];
      top: TopMatch | null;
      /** Welsh labels by slug, for cards that show a business's category and place. */
      welsh: {
        categories: Record<string, string>;
        places: Record<string, string>;
      };
      total: number;
      /** False when a source failed and its counts are zero rather than real. */
      complete: boolean;
      /** Only present when nothing at all matched. */
      recovery: {
        suggestions: SearchSuggestion[];
        categories: CategoryWithBusinessCount[];
      } | null;
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
      .limit(LIST_TYPE_LIMIT);
  } catch {
    return null;
  }
}

function searchPlaces(
  tree: PlaceTree | null,
  query: string,
): SiteSearchPlace[] {
  if (!tree) return [];
  return tree.nodes
    .filter((node) => placeMatchesText(node, query))
    .map((node) => ({
      slug: node.slug,
      name: node.name,
      welshName: node.welshName,
      businesses: tree.totalCount.get(node.id) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.businesses - a.businesses || a.name.localeCompare(b.name, "en-GB"),
    )
    .slice(0, LIST_TYPE_LIMIT);
}

/**
 * One search across the public, published content types. It composes the
 * existing public read paths (directory, offers, events, the place hierarchy,
 * active categories, published guides) so it can never surface a draft,
 * suspended or private record that those paths already hide. Every source
 * degrades independently: only when all of them fail is the page
 * "unavailable".
 *
 * The open tab (`type`) is fetched a page at a time; the others only
 * contribute a short preview and their count.
 */
export async function searchSite(
  rawQuery: string | null | undefined,
  options: { type?: SearchType; page?: number } = {},
): Promise<SiteSearchResult> {
  const query = normaliseSiteQuery(rawQuery);
  if (!query) return { state: "idle" };

  const type = options.type ?? "all";
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const sized = (own: SearchType) =>
    type === own
      ? { page, pageSize: SEARCH_TYPE_PAGE_SIZE }
      : { page: 1, pageSize: SITE_SEARCH_SECTION_LIMIT };

  const [
    businessResult,
    offerResult,
    eventResult,
    tree,
    categories,
    categoryCounts,
    guides,
  ] = await Promise.all([
    listPublishedBusinesses({ query, ...sized("businesses") }),
    listPublicOffers({ query, ...sized("offers") }),
    listPublicEvents({ query, ...sized("events") }),
    loadPlaceTree(),
    listActiveCategories(),
    listCategoriesWithPublishedBusinesses({ limit: 100 }),
    searchGuides(query),
  ]);

  if (
    businessResult.state === "unavailable" &&
    offerResult.state === "unavailable" &&
    eventResult.state === "unavailable" &&
    guides === null
  ) {
    return { state: "unavailable", query };
  }

  const places = searchPlaces(tree, query);
  const businessCounts = new Map(
    categoryCounts.map((item) => [item.slug, item.count]),
  );
  const matchedCategories: SiteSearchCategory[] = categories
    .filter((item) => matchesFolded([item.name, item.welshLabel], query))
    .map((item) => ({
      slug: item.slug,
      name: item.name,
      welshLabel: item.welshLabel,
      businesses: businessCounts.get(item.slug) ?? 0,
    }))
    .sort((a, b) => b.businesses - a.businesses)
    .slice(0, LIST_TYPE_LIMIT);

  // "coffee" names no business but names a category: lead into that category
  // rather than report an empty directory.
  let businesses = {
    items: businessResult.businesses,
    total: businessResult.total,
    viaCategory: null as { slug: string; name: string } | null,
  };
  let businessPages = businessResult.totalPages;
  const lead = matchedCategories.find((item) => item.businesses > 0);
  if (businessResult.state === "ready" && businessResult.total === 0 && lead) {
    const viaCategory = await listPublishedBusinesses({
      category: lead.slug,
      ...sized("businesses"),
    });
    if (viaCategory.state === "ready" && viaCategory.total > 0) {
      businesses = {
        items: viaCategory.businesses,
        total: viaCategory.total,
        viaCategory: { slug: lead.slug, name: lead.name },
      };
      businessPages = viaCategory.totalPages;
    }
  }

  const guideItems = guides ?? [];
  const counts: SearchCounts = {
    businesses: businesses.total,
    offers: offerResult.total,
    events: eventResult.total,
    places: places.length,
    categories: matchedCategories.length,
    guides: guideItems.length,
  };
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const top = businesses.viaCategory
    ? null
    : pickTopMatch(query, {
        business: businesses.items.map((item) => ({
          slug: item.slug,
          labels: [item.tradingName, item.welshName ?? null],
        })),
        place: places.map((item) => ({
          slug: item.slug,
          labels: [item.name, item.welshName],
        })),
        category: matchedCategories.map((item) => ({
          slug: item.slug,
          labels: [item.name, item.welshLabel],
        })),
      });

  const totalPages =
    type === "businesses"
      ? businessPages
      : type === "offers"
        ? offerResult.totalPages
        : type === "events"
          ? eventResult.totalPages
          : 0;

  const recovery =
    total === 0
      ? {
          suggestions: await listSearchSuggestions(query),
          categories: await listCategoriesWithPublishedBusinesses({ limit: 6 }),
        }
      : null;

  return {
    state: "ready",
    query,
    type,
    page,
    totalPages,
    counts,
    businesses,
    offers: { items: offerResult.offers, total: offerResult.total },
    events: { items: eventResult.events, total: eventResult.total },
    places,
    categories: matchedCategories,
    guides: guideItems,
    top,
    welsh: {
      categories: Object.fromEntries(
        categories.flatMap((item) =>
          item.welshLabel ? [[item.slug, item.welshLabel]] : [],
        ),
      ),
      places: Object.fromEntries(
        (tree?.nodes ?? []).flatMap((node) =>
          node.welshName ? [[node.slug, node.welshName]] : [],
        ),
      ),
    },
    total,
    complete:
      businessResult.state !== "unavailable" &&
      offerResult.state !== "unavailable" &&
      eventResult.state !== "unavailable" &&
      guides !== null &&
      // Reference data that failed to load reads as "no places or categories".
      tree !== null &&
      categories.length > 0,
    recovery,
  };
}

export type SearchStart = {
  categories: CategoryWithBusinessCount[];
  places: { slug: string; name: string; welshName: string | null }[];
};

/**
 * What to offer before anything is typed: the categories and towns that
 * actually have published businesses, so every starting point leads
 * somewhere. Empty lists when the data is unavailable.
 */
export async function loadSearchStart(): Promise<SearchStart> {
  const [categories, tree] = await Promise.all([
    listCategoriesWithPublishedBusinesses({ limit: 8 }),
    loadPlaceTree(),
  ]);
  const places = tree
    ? tree.nodes
        .filter((node) => node.businessCount > 0 && isLocality(node))
        .sort(
          (a, b) =>
            b.businessCount - a.businessCount ||
            a.name.localeCompare(b.name, "en-GB"),
        )
        .slice(0, 8)
        .map(({ slug, name, welshName }) => ({ slug, name, welshName }))
    : [];
  return { categories, places };
}
