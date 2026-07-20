import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";

export type ActivePlaceOption = {
  id: string;
  slug: string;
  name: string;
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
