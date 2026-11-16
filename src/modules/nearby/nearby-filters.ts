import {
  DEFAULT_RADIUS_KM,
  RADIUS_OPTIONS_KM,
  directoryHref,
  parseRadius,
} from "@/modules/businesses/directory-filters";
import { offerHref, parseNearSlug } from "@/modules/businesses/offer-filters";
import { eventsHref } from "@/modules/events/event-filters";

/**
 * URL state of the "nearby" page (doc 119): a public place and a distance.
 * The visitor's device position is never part of it; "Near me" turns the
 * position into the nearest place in the browser and only that place's slug
 * is sent.
 */
export type NearbyFilters = {
  near: string;
  radius: number;
};

export type RawNearbyParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseNearbyFilters(params: RawNearbyParams): NearbyFilters {
  return {
    near: parseNearSlug(first(params.near)),
    radius: parseRadius(first(params.radius)),
  };
}

/** The `/nearby` URL; the default distance is left out so links stay short. */
export function nearbyHref(filters: Partial<NearbyFilters> = {}): string {
  const params = new URLSearchParams();
  if (filters.near) {
    params.set("near", filters.near);
    if (filters.radius && filters.radius !== DEFAULT_RADIUS_KM) {
      params.set("radius", String(filters.radius));
    }
  }
  const query = params.toString();
  return query ? `/nearby?${query}` : "/nearby";
}

export type NearbyRadiusLink = {
  radius: number;
  href: string;
  current: boolean;
};

/** One link per offered distance, for the "within" switch. */
export function nearbyRadiusLinks(filters: NearbyFilters): NearbyRadiusLink[] {
  return RADIUS_OPTIONS_KM.map((radius) => ({
    radius,
    href: nearbyHref({ near: filters.near, radius }),
    current: radius === filters.radius,
  }));
}

/**
 * Where each section's "see all" leads: the full list with the same place and
 * distance, so the count on the nearby page and the list it opens agree.
 */
export function nearbyListHrefs(filters: NearbyFilters): {
  openNow: string;
  businesses: string;
  events: string;
  offers: string;
} {
  const scope = { near: filters.near, radius: filters.radius };
  return {
    openNow: directoryHref({ ...scope, openNow: true }),
    businesses: directoryHref(scope),
    events: eventsHref(scope),
    offers: offerHref(scope),
  };
}

/** Kilometres as a short label: one decimal under 10km, whole numbers above. */
export function formatKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return "0";
  return distanceKm < 10
    ? String(Math.round(distanceKm * 10) / 10)
    : String(Math.round(distanceKm));
}
