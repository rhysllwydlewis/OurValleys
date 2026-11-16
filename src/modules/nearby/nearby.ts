import "server-only";

import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { placeCoordinate } from "@/lib/database/schema/reference";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import {
  listPublicOffers,
  type PublicOffer,
} from "@/modules/businesses/public-offers";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import { listPublicEvents, type PublicEvent } from "@/modules/events/public";
import { placesWithin, type NearbyPlaceRow } from "./nearby-model";
import type { NearbyFilters } from "./nearby-filters";

/** Cards shown per section; the "see all" link opens the full list. */
export const NEARBY_SECTION_LIMIT = 6;
/** Neighbouring places listed beside the results. */
export const NEARBY_PLACES_LIMIT = 12;

export type NearbyOrigin = {
  slug: string;
  name: string;
  welshName: string | null;
};

export type NearbyPlaceLink = {
  slug: string;
  name: string;
  welshName: string | null;
  distanceKm: number;
};

/** One section's cards with the size of the full list behind "see all". */
export type NearbySection<T> = { items: T[]; total: number };

export type NearbyResult =
  /** No place asked for yet: the page shows the chooser. */
  | { state: "choose" }
  /** The asked-for place is not an active place with a known centre. */
  | { state: "unknown" }
  | { state: "unavailable" }
  | {
      state: "ready";
      origin: NearbyOrigin;
      /** Businesses open at this moment, nearest first. */
      openNow: NearbySection<PublicBusinessSummary>;
      /** Every business in range, nearest first; shown when none is open. */
      businesses: NearbySection<PublicBusinessSummary>;
      events: NearbySection<PublicEvent>;
      offers: NearbySection<PublicOffer>;
      places: NearbyPlaceLink[];
    };

/**
 * Every active place with a stored locality centre. Public reference data
 * only: no business, address or resident data.
 */
async function loadPlaceRows(): Promise<NearbyPlaceRow[]> {
  return getDatabase()
    .select({
      slug: place.slug,
      name: place.canonicalName,
      welshName: place.welshName,
      placeType: place.placeType,
      latitude: placeCoordinate.latitude,
      longitude: placeCoordinate.longitude,
    })
    .from(place)
    .innerJoin(placeCoordinate, eq(placeCoordinate.placeId, place.id))
    .where(eq(place.status, "active"));
}

/**
 * Everything public within `radius` km of a place's centre (doc 119): open
 * businesses, upcoming events, current offers and neighbouring places.
 * Distances run between public locality centres, never addresses, exactly as
 * the `near` filters on the directory, events and offers do, so each section's
 * total matches the list its "see all" link opens. Only published businesses
 * and their public offers and events are read, through the same public list
 * functions those pages use.
 */
export async function loadNearby(
  filters: NearbyFilters,
  options: { locale?: "en" | "cy"; now?: Date } = {},
): Promise<NearbyResult> {
  if (!filters.near) return { state: "choose" };

  let rows: NearbyPlaceRow[];
  try {
    rows = await loadPlaceRows();
  } catch {
    return { state: "unavailable" };
  }
  const origin = rows.find((row) => row.slug === filters.near);
  if (!origin) return { state: "unknown" };

  const scope = { nearPlace: origin.slug, radiusKm: filters.radius };
  const [openNow, businesses, events, offers] = await Promise.all([
    listPublishedBusinesses({
      ...scope,
      openNow: true,
      now: options.now,
      pageSize: NEARBY_SECTION_LIMIT,
    }),
    listPublishedBusinesses({ ...scope, pageSize: NEARBY_SECTION_LIMIT }),
    listPublicEvents({
      near: origin.slug,
      radius: filters.radius,
      pageSize: NEARBY_SECTION_LIMIT,
      locale: options.locale,
    }),
    listPublicOffers({
      near: origin.slug,
      radius: filters.radius,
      pageSize: NEARBY_SECTION_LIMIT,
      locale: options.locale,
    }),
  ]);
  if (
    openNow.state === "unavailable" ||
    businesses.state === "unavailable" ||
    events.state === "unavailable" ||
    offers.state === "unavailable"
  ) {
    return { state: "unavailable" };
  }

  return {
    state: "ready",
    origin: {
      slug: origin.slug,
      name: origin.name,
      welshName: origin.welshName,
    },
    openNow: { items: openNow.businesses, total: openNow.total },
    businesses: { items: businesses.businesses, total: businesses.total },
    events: { items: events.events, total: events.total },
    offers: { items: offers.offers, total: offers.total },
    places: placesWithin(origin, rows, filters.radius, NEARBY_PLACES_LIMIT).map(
      ({ row, distanceKm }) => ({
        slug: row.slug,
        name: row.name,
        welshName: row.welshName,
        distanceKm,
      }),
    ),
  };
}
