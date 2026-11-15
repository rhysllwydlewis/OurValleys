import "server-only";
import { eq, inArray, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { placeCoordinate } from "@/lib/database/schema/reference";
import type { PlaceCentroid } from "@/modules/businesses/near-me";

/** Towns and villages a visitor can plausibly be standing in; not valleys or regions. */
const CENTROID_PLACE_TYPES = ["town", "village", "neighbourhood"];

async function loadPlaceCentroids(): Promise<PlaceCentroid[]> {
  const rows = await getDatabase()
    .select({
      slug: place.slug,
      name: place.canonicalName,
      welshName: place.welshName,
      latitude: placeCoordinate.latitude,
      longitude: placeCoordinate.longitude,
    })
    .from(place)
    .innerJoin(placeCoordinate, eq(placeCoordinate.placeId, place.id))
    .where(
      and(
        eq(place.status, "active"),
        inArray(place.placeType, CENTROID_PLACE_TYPES),
      ),
    );
  return rows;
}

/**
 * Public locality centroids only (doc 101): no business, address or resident
 * data, so one shared cache entry is safe. A failed load throws and is never
 * cached; the wrapper below turns it into "no centroids", which hides the
 * "Near me" control rather than breaking the directory.
 */
const cachedCentroids = unstable_cache(
  loadPlaceCentroids,
  ["public-place-centroids"],
  { revalidate: 3600, tags: ["business-directory"] },
);

export async function listPlaceCentroids(): Promise<PlaceCentroid[]> {
  try {
    return await cachedCentroids();
  } catch {
    try {
      return await loadPlaceCentroids();
    } catch {
      return [];
    }
  }
}
