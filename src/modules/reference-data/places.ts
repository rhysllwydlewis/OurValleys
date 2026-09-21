import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { placeCoordinate } from "@/lib/database/schema/reference";

export type ActivePlaceOption = {
  id: string;
  slug: string;
  name: string;
};

export type PlaceDetail = {
  id: string;
  slug: string;
  name: string;
  welshName: string | null;
  placeType: string;
  coverageStatus: string;
  editorialSummary: string;
};

export type NearbyPlace = {
  slug: string;
  name: string;
  distanceKm: number;
};

/**
 * Places power the manual location filters on public discovery surfaces.
 * Returns an empty list when the database is unavailable so search remains
 * usable with the query field alone.
 */
export async function listActivePlaces(): Promise<ActivePlaceOption[]> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: place.id,
        slug: place.slug,
        name: place.canonicalName,
      })
      .from(place)
      .where(eq(place.status, "active"))
      .orderBy(asc(place.canonicalName))
      .limit(50);

    return rows;
  } catch {
    return [];
  }
}

/** Full record for a single active place, used to render its public page. */
export async function getPlaceBySlug(
  slug: string,
): Promise<PlaceDetail | null> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        id: place.id,
        slug: place.slug,
        name: place.canonicalName,
        welshName: place.welshName,
        placeType: place.placeType,
        coverageStatus: place.coverageStatus,
        editorialSummary: place.editorialSummary,
      })
      .from(place)
      .where(and(eq(place.slug, slug), eq(place.status, "active")))
      .limit(1);

    return row ?? null;
  } catch {
    return null;
  }
}

const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const chordSquared =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(chordSquared)));
}

/**
 * Nearby places by locality-centroid distance (`place_coordinate`), never
 * business or resident addresses. Places without a stored coordinate simply
 * produce no suggestions rather than an error.
 */
export async function listNearbyPlaces(
  placeId: string,
  limit = 4,
): Promise<NearbyPlace[]> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: place.id,
        slug: place.slug,
        name: place.canonicalName,
        latitude: placeCoordinate.latitude,
        longitude: placeCoordinate.longitude,
      })
      .from(place)
      .innerJoin(placeCoordinate, eq(placeCoordinate.placeId, place.id))
      .where(eq(place.status, "active"));

    const origin = rows.find((row) => row.id === placeId);
    if (!origin) return [];

    return rows
      .filter((row) => row.id !== placeId)
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        distanceKm: haversineDistanceKm(origin, row),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  } catch {
    return [];
  }
}
