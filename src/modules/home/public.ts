import "server-only";

import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { listPublicEvents } from "@/modules/events/public";
import { listPublicGuides } from "@/modules/guides/public";
import { listActivePlaces } from "@/modules/reference-data/places";

const featuredBusinessSlug = "cwm-coil-heating";

export async function getHomepageDiscovery() {
  const [businessResult, eventResult, places] = await Promise.all([
    getPublishedBusinessBySlug(featuredBusinessSlug),
    listPublicEvents(),
    listActivePlaces(),
  ]);

  return {
    featuredBusiness:
      businessResult.state === "ready" ? businessResult.business : null,
    events: eventResult.state === "ready" ? eventResult.events.slice(0, 3) : [],
    eventsAvailable: eventResult.state === "ready",
    guides: listPublicGuides().slice(0, 3),
    places: places.slice(0, 6),
  };
}
