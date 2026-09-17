import "server-only";

import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { listPublicEvents } from "@/modules/events/public";
import { listPublicGuides } from "@/modules/guides/public";
import { listActivePlaces } from "@/modules/reference-data/places";

const featuredBusinessSlug = "cwm-coil-heating";

const homepageLimits = {
  events: 3,
  guides: 3,
  places: 6,
} as const;

type HomepageDiscoveryLoaders = {
  getFeaturedBusiness: typeof getPublishedBusinessBySlug;
  getEvents: typeof listPublicEvents;
  getGuides: typeof listPublicGuides;
  getPlaces: typeof listActivePlaces;
};

const defaultLoaders: HomepageDiscoveryLoaders = {
  getFeaturedBusiness: getPublishedBusinessBySlug,
  getEvents: listPublicEvents,
  getGuides: listPublicGuides,
  getPlaces: listActivePlaces,
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

export async function getHomepageDiscovery(
  loaders: HomepageDiscoveryLoaders = defaultLoaders,
) {
  const [businessResult, eventResult, placeResult, guideResult] =
    await Promise.allSettled([
      loaders.getFeaturedBusiness(featuredBusinessSlug),
      loaders.getEvents(),
      loaders.getPlaces(),
      loaders.getGuides(),
    ]);

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
    places,
    placesState:
      placeResult.status === "rejected"
        ? ("unavailable" as const)
        : allPlaces.length > 0
          ? ("ready" as const)
          : ("empty" as const),
  };
}
