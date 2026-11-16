import { haversineDistanceKm } from "@/lib/geo";

/** An active place and its public locality centre. */
export type NearbyPlaceRow = {
  slug: string;
  name: string;
  welshName: string | null;
  placeType: string;
  latitude: number;
  longitude: number;
};

/**
 * Towns and villages are places to go to; valleys and regions are groupings
 * and would read as "Cynon Valley · 2km" beside a town that sits inside it.
 */
const LOCALITY_TYPES: ReadonlySet<string> = new Set([
  "town",
  "village",
  "neighbourhood",
]);

/**
 * Localities whose centre is within `radiusKm` of the origin's, nearest first
 * (ties by name so the order is stable), without the origin itself.
 */
export function placesWithin(
  origin: NearbyPlaceRow,
  rows: readonly NearbyPlaceRow[],
  radiusKm: number,
  limit: number,
): { row: NearbyPlaceRow; distanceKm: number }[] {
  return rows
    .filter(
      (row) => row.slug !== origin.slug && LOCALITY_TYPES.has(row.placeType),
    )
    .map((row) => ({ row, distanceKm: haversineDistanceKm(origin, row) }))
    .filter(
      ({ distanceKm }) => Number.isFinite(distanceKm) && distanceKm <= radiusKm,
    )
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm ||
        a.row.name.localeCompare(b.row.name, "en"),
    )
    .slice(0, Math.max(0, limit));
}

export type NearbyCounts = {
  openNow: number;
  businesses: number;
  events: number;
  offers: number;
};

/** True when nothing public is in range, so the page can suggest a wider distance. */
export function nothingNearby(counts: NearbyCounts): boolean {
  return counts.businesses === 0 && counts.events === 0 && counts.offers === 0;
}

/**
 * The next larger offered distance, or null at the widest. Used by the empty
 * state's "try a wider distance" link.
 */
export function widerRadius(
  radius: number,
  options: readonly number[],
): number | null {
  return options.find((option) => option > radius) ?? null;
}
