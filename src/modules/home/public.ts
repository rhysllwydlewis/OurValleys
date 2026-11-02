import "server-only";

import { unstable_cache } from "next/cache";

import { getValleysMap, type MapPlace } from "@/modules/businesses/map";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { listPublicOffers } from "@/modules/businesses/public-offers";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { listPublicEvents } from "@/modules/events/public";
import { listPublicGuides } from "@/modules/guides/public";
import { listActivePlaces } from "@/modules/reference-data/places";

const featuredBusinessSlug = "cwm-coil-heating";

const homepageLimits = {
  events: 3,
  guides: 3,
  offers: 3,
  places: 6,
  newBusinesses: 3,
} as const;

/** One area tile: a place and how many published businesses it has. */
export type HomepageArea = {
  slug: string;
  name: string;
  welshName: string | null;
  /** Null when the live count could not be loaded; never a guess. */
  businessCount: number | null;
};

/** A place the "near you" widget can measure distance to (public centroid). */
export type HomepageNearPlace = {
  slug: string;
  name: string;
  welshName: string | null;
  latitude: number;
  longitude: number;
};

type HomepageDiscoveryLoaders = {
  getFeaturedBusiness: typeof getPublishedBusinessBySlug;
  getEvents: typeof listPublicEvents;
  getGuides: typeof listPublicGuides;
  getOffers: typeof listPublicOffers;
  getPlaces: typeof listActivePlaces;
  getMap: typeof getValleysMap;
  getNewBusinesses: typeof listPublishedBusinesses;
};

const defaultLoaders: HomepageDiscoveryLoaders = {
  getFeaturedBusiness: getPublishedBusinessBySlug,
  getEvents: listPublicEvents,
  getGuides: listPublicGuides,
  getOffers: listPublicOffers,
  getPlaces: listActivePlaces,
  getMap: getValleysMap,
  getNewBusinesses: listPublishedBusinesses,
};

export type HomepageSourceState = "ready" | "empty" | "unavailable";

export function selectHomepagePlaces<T extends { slug: string }>(
  allPlaces: readonly T[],
  featuredPlaceSlug: string | undefined,
): T[] {
  const initialPlaces = allPlaces.slice(0, homepageLimits.places);
  const featuredPlace = featuredPlaceSlug
    ? allPlaces.find((candidate) => candidate.slug === featuredPlaceSlug)
    : undefined;

  return featuredPlace &&
    !initialPlaces.some((candidate) => candidate.slug === featuredPlace.slug)
    ? [...initialPlaces.slice(0, homepageLimits.places - 1), featuredPlace]
    : initialPlaces;
}

/**
 * The six area tiles: places that have published businesses come first (most
 * first, then A-Z), the featured business's place is always included, and a
 * place without businesses only fills a remaining slot. The count is the same
 * number the directory and the map use.
 */
export function selectHomepageAreas(
  mapPlaces: readonly MapPlace[],
  featuredPlaceSlug: string | undefined,
  limit: number = homepageLimits.places,
): HomepageArea[] {
  const ranked = [...mapPlaces].sort(
    (a, b) =>
      b.businessCount - a.businessCount ||
      a.name.localeCompare(b.name, "en-GB"),
  );
  const chosen = ranked.slice(0, limit);
  const featured = featuredPlaceSlug
    ? ranked.find((candidate) => candidate.slug === featuredPlaceSlug)
    : undefined;
  const withFeatured =
    featured && !chosen.some((candidate) => candidate.slug === featured.slug)
      ? [...chosen.slice(0, limit - 1), featured]
      : chosen;
  return withFeatured.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    welshName: entry.welshName,
    businessCount: entry.businessCount,
  }));
}

/** Public locality centroids only, with nothing about any business. */
export function toNearPlaces(
  mapPlaces: readonly MapPlace[],
): HomepageNearPlace[] {
  return mapPlaces
    .filter(
      (entry) =>
        Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude),
    )
    .map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      welshName: entry.welshName,
      latitude: entry.latitude,
      longitude: entry.longitude,
    }));
}

type HomepageDiscovery = Awaited<ReturnType<typeof loadHomepageDiscovery>>;

/** Fields the cache stores as ISO strings and the reader turns back into Dates. */
const DATE_KEYS = new Set(["startsAt", "endsAt", "publishedAt", "updatedAt"]);

/** Restores Date values after the cache's JSON round trip. */
export function reviveHomepageDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reviveHomepageDates) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] =
        DATE_KEYS.has(key) && typeof item === "string"
          ? new Date(item)
          : reviveHomepageDates(item);
    }
    return out as T;
  }
  return value;
}

/** True when any section failed to load, so the result must not be cached. */
function isDegraded(discovery: HomepageDiscovery): boolean {
  return [
    discovery.featuredBusinessState,
    discovery.eventsState,
    discovery.guidesState,
    discovery.offersState,
    discovery.placesState,
    discovery.newBusinessesState,
  ].includes("unavailable");
}

class DegradedDiscovery extends Error {
  constructor(readonly discovery: HomepageDiscovery) {
    super("homepage discovery degraded");
  }
}

const HOMEPAGE_CACHE_SECONDS = 60;

/** Sections come from the public projection only, so one entry is safe to share. */
const cachedDiscovery = unstable_cache(
  async (locale: "en" | "cy") => {
    const discovery = await loadHomepageDiscovery(defaultLoaders, locale);
    // Throwing keeps a failed load out of the cache; the caller still renders it.
    if (isDegraded(discovery)) throw new DegradedDiscovery(discovery);
    return discovery;
  },
  ["homepage-discovery"],
  { revalidate: HOMEPAGE_CACHE_SECONDS, tags: ["homepage"] },
);

/**
 * Homepage data. The default loaders are cached for a minute so a traffic spike
 * does not run seven queries per visit; custom loaders (tests) always run live.
 */
export async function getHomepageDiscovery(
  loaders?: HomepageDiscoveryLoaders,
  locale: "en" | "cy" = "en",
): Promise<HomepageDiscovery> {
  if (loaders) return loadHomepageDiscovery(loaders, locale);
  try {
    return reviveHomepageDates(await cachedDiscovery(locale));
  } catch (error) {
    if (error instanceof DegradedDiscovery) return error.discovery;
    // Cache unavailable (or it wrapped the error): load live rather than fail.
    return loadHomepageDiscovery(defaultLoaders, locale);
  }
}

async function loadHomepageDiscovery(
  loaders: HomepageDiscoveryLoaders,
  locale: "en" | "cy",
) {
  const [
    businessResult,
    eventResult,
    placeResult,
    guideResult,
    offerResult,
    mapResult,
    newestResult,
  ] = await Promise.allSettled([
    loaders.getFeaturedBusiness(featuredBusinessSlug),
    loaders.getEvents({ locale }),
    loaders.getPlaces(),
    loaders.getGuides(locale),
    loaders.getOffers({ locale }),
    loaders.getMap(),
    loaders.getNewBusinesses({
      sort: "newest",
      pageSize: homepageLimits.newBusinesses,
    }),
  ]);

  const mapPlaces =
    mapResult.status === "fulfilled" && mapResult.value.state === "ready"
      ? mapResult.value.places
      : [];
  const totalBusinesses =
    mapResult.status === "fulfilled" && mapResult.value.state === "ready"
      ? mapResult.value.totalBusinesses
      : null;
  const newBusinesses =
    newestResult.status === "fulfilled" && newestResult.value.state === "ready"
      ? newestResult.value.businesses.slice(0, homepageLimits.newBusinesses)
      : [];
  const newBusinessesState: HomepageSourceState =
    newestResult.status === "rejected" ||
    (newestResult.status === "fulfilled" &&
      newestResult.value.state === "unavailable")
      ? "unavailable"
      : newBusinesses.length > 0
        ? "ready"
        : "empty";

  const guides =
    guideResult.status === "fulfilled" && guideResult.value.state === "ready"
      ? guideResult.value.guides.slice(0, homepageLimits.guides)
      : [];
  const guidesState: HomepageSourceState =
    guideResult.status === "rejected" ||
    (guideResult.status === "fulfilled" &&
      guideResult.value.state === "unavailable")
      ? "unavailable"
      : guides.length > 0
        ? "ready"
        : "empty";

  const offers =
    offerResult.status === "fulfilled" && offerResult.value.state === "ready"
      ? offerResult.value.offers.slice(0, homepageLimits.offers)
      : [];
  const offersState: HomepageSourceState =
    offerResult.status === "rejected" ||
    (offerResult.status === "fulfilled" &&
      offerResult.value.state === "unavailable")
      ? "unavailable"
      : offers.length > 0
        ? "ready"
        : "empty";

  const featuredBusiness =
    businessResult.status === "fulfilled" &&
    businessResult.value.state === "ready"
      ? businessResult.value.business
      : null;

  const events =
    eventResult.status === "fulfilled" && eventResult.value.state === "ready"
      ? eventResult.value.events.slice(0, homepageLimits.events)
      : [];

  const allPlaces = placeResult.status === "fulfilled" ? placeResult.value : [];
  const places = selectHomepagePlaces(allPlaces, featuredBusiness?.place.slug);
  // Live counts when the map data loaded; otherwise the plain place list so
  // the tiles still work (without a number) rather than disappearing.
  const areas: HomepageArea[] =
    mapPlaces.length > 0
      ? selectHomepageAreas(mapPlaces, featuredBusiness?.place.slug)
      : places.map((entry) => ({
          slug: entry.slug,
          name: entry.name,
          welshName: entry.welshName,
          businessCount: null,
        }));

  return {
    featuredBusiness,
    featuredBusinessState:
      businessResult.status === "rejected" ||
      (businessResult.status === "fulfilled" &&
        businessResult.value.state === "unavailable")
        ? ("unavailable" as const)
        : featuredBusiness
          ? ("ready" as const)
          : ("empty" as const),
    events,
    eventsState:
      eventResult.status === "rejected" ||
      (eventResult.status === "fulfilled" &&
        eventResult.value.state === "unavailable")
        ? ("unavailable" as const)
        : events.length > 0
          ? ("ready" as const)
          : ("empty" as const),
    guides,
    guidesState,
    offers,
    offersState,
    places,
    allPlaces,
    areas,
    nearPlaces: toNearPlaces(mapPlaces),
    totalBusinesses,
    newBusinesses,
    newBusinessesState,
    placesState:
      placeResult.status === "rejected"
        ? ("unavailable" as const)
        : allPlaces.length > 0
          ? ("ready" as const)
          : ("empty" as const),
  };
}
