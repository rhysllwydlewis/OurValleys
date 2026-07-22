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

export async function getHomepageDiscovery(
  loaders: HomepageDiscoveryLoaders = defaultLoaders,
) {
  const [businessResult, eventResult, placeResult] = await Promise.allSettled([
    loaders.getFeaturedBusiness(featuredBusinessSlug),
    loaders.getEvents(),
    loaders.getPlaces(),
  ]);

  let guides: ReturnType<typeof listPublicGuides> = [];
  let guidesState: HomepageSourceState = "unavailable";

  try {
    guides = loaders.getGuides().slice(0, homepageLimits.guides);
    guidesState = guides.length > 0 ? "ready" : "empty";
  } catch {
    guides = [];
  }

  const featuredBusiness =
    businessResult.status === "fulfilled" &&
    businessResult.value.state === "ready"
      ? businessResult.value.business
      : null;

  const events =
    eventResult.status === "fulfilled" && eventResult.value.state === "ready"
      ? eventResult.value.events.slice(0, homepageLimits.events)
      : [];

  const places =
    placeResult.status === "fulfilled"
      ? placeResult.value.slice(0, homepageLimits.places)
      : [];

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
        : places.length > 0
          ? ("ready" as const)
          : ("empty" as const),
  };
}
