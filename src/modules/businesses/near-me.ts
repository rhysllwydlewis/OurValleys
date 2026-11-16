import { eventsHref, type EventFilters } from "@/modules/events/event-filters";
import { nearbyHref } from "@/modules/nearby/nearby-filters";
import { haversineDistanceKm } from "@/lib/geo";
import { OUTSIDE_AREA_KM } from "@/lib/map-projection";
import {
  DEFAULT_RADIUS_KM,
  RADIUS_OPTIONS_KM,
  directoryHref,
  type DirectoryFilters,
} from "./directory-filters";
import { offerHref, type OfferFilters } from "./offer-filters";

/**
 * "Near me" for the directory (doc 101). The browser reads the device position
 * and this pure model turns it into the nearest public place, which the page
 * then uses as the existing `near=<place>` filter. The position itself is
 * never sent anywhere: only a place slug reaches the server.
 */
export type PlaceCentroid = {
  slug: string;
  name: string;
  welshName: string | null;
  latitude: number;
  longitude: number;
};

export type NearMeResult =
  | {
      status: "found";
      place: PlaceCentroid;
      distanceKm: number;
      radiusKm: number;
    }
  | { status: "outside"; distanceKm: number }
  | { status: "invalid" };

function validPosition(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * Smallest offered radius that still reaches the nearest place centre with a
 * little room to spare, never below `minimum`; the largest offered when none fit.
 */
export function radiusFor(distanceKm: number, minimum: number): number {
  const wanted = Math.max(minimum, distanceKm + 2);
  return (
    RADIUS_OPTIONS_KM.find((option) => option >= wanted) ??
    RADIUS_OPTIONS_KM[RADIUS_OPTIONS_KM.length - 1]!
  );
}

export function resolveNearMe(
  position: { latitude: number; longitude: number },
  centroids: readonly PlaceCentroid[],
  currentRadius: number = DEFAULT_RADIUS_KM,
): NearMeResult {
  if (!validPosition(position.latitude, position.longitude)) {
    return { status: "invalid" };
  }
  let best: { place: PlaceCentroid; distanceKm: number } | null = null;
  for (const centroid of centroids) {
    if (!validPosition(centroid.latitude, centroid.longitude)) continue;
    const distanceKm = haversineDistanceKm(position, centroid);
    if (
      !best ||
      distanceKm < best.distanceKm ||
      (distanceKm === best.distanceKm && centroid.slug < best.place.slug)
    ) {
      best = { place: centroid, distanceKm };
    }
  }
  if (!best) return { status: "invalid" };
  if (best.distanceKm > OUTSIDE_AREA_KM) {
    return { status: "outside", distanceKm: best.distanceKm };
  }
  return {
    status: "found",
    place: best.place,
    distanceKm: best.distanceKm,
    radiusKm: radiusFor(best.distanceKm, currentRadius),
  };
}

/**
 * The directory URL after "Near me": the visitor's other choices stay, paging
 * resets, and an explicit sort is kept (relevance already sorts nearest first
 * once a near place is set).
 */
export function nearMeHref(
  filters: DirectoryFilters,
  result: Extract<NearMeResult, { status: "found" }>,
): string {
  return directoryHref({
    ...filters,
    near: result.place.slug,
    radius: result.radiusKm,
    page: 1,
  });
}

/**
 * The events URL after "Near me" (doc 102): the visitor's other choices stay
 * and paging resets. A picked day or quick range is kept, so "this weekend
 * near me" works.
 */
export function eventsNearMeHref(
  filters: EventFilters,
  result: Extract<NearMeResult, { status: "found" }>,
): string {
  return eventsHref({
    ...filters,
    near: result.place.slug,
    radius: result.radiusKm,
    page: 1,
  });
}

/**
 * The offers URL after "Near me" (doc 119): search text, category, "ending
 * this week" and sort stay; paging resets.
 */
export function offersNearMeHref(
  filters: OfferFilters,
  result: Extract<NearMeResult, { status: "found" }>,
): string {
  return offerHref(filters, {
    near: result.place.slug,
    radius: result.radiusKm,
    page: 1,
  });
}

/** The `/nearby` URL after "Near me" (doc 119): the nearest place and a radius that reaches it. */
export function nearbyNearMeHref(
  result: Extract<NearMeResult, { status: "found" }>,
): string {
  return nearbyHref({ near: result.place.slug, radius: result.radiusKm });
}
