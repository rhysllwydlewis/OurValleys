import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { placeCoordinate } from "@/lib/database/schema/reference";
import { haversineDistanceKm } from "@/lib/geo";

/**
 * Surfaces places with real business density (`active`, `pilot`, `seeding`)
 * ahead of `planned` council areas that only have reference-data geography
 * so far. Without this, alphabetical ordering alone would let newly added,
 * still-empty council areas crowd out the founding RCT area on place
 * pickers and the homepage as coverage expands.
 */
const coverageStatusRank = sql<number>`case ${place.coverageStatus}
  when 'active' then 0
  when 'pilot' then 1
  when 'seeding' then 2
  else 3
end`;

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
 *
 * The limit stays well above the current South Wales Valleys place count
 * (under 100 across all seven council areas) so alphabetically later towns,
 * including founding-area RCT places, are never silently truncated out of
 * place pickers as more council areas are seeded.
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
      .orderBy(coverageStatusRank, asc(place.canonicalName))
      .limit(300);

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
