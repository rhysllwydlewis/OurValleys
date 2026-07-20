import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { category } from "@/lib/database/schema/business";

export type ActiveCategoryOption = {
  id: string;
  slug: string;
  name: string;
};

/**
 * Active categories power the category filter on public discovery surfaces.
 * Returns an empty list when the database is unavailable so search remains
 * usable with the query field alone.
 */
export async function listActiveCategories(): Promise<ActiveCategoryOption[]> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: category.id,
        slug: category.slug,
        name: category.name,
      })
      .from(category)
      .where(eq(category.status, "active"))
      .orderBy(asc(category.name))
      .limit(100);

    return rows;
  } catch {
    return [];
  }
}
