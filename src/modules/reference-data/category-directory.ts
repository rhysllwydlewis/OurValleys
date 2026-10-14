import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { category } from "@/lib/database/schema/business";
import { listCategoriesWithPublishedBusinesses } from "@/modules/businesses/public";
import type { CategoryEntry } from "./category-directory-model";

export type CategoryDirectoryResult =
  | { state: "ready"; categories: CategoryEntry[] }
  | { state: "unavailable"; categories: [] };

/**
 * Every active category with how many published businesses sit in it. The
 * counts follow the same publication rules as the directory, so a number here
 * matches what the category's page then lists. A failed count read degrades to
 * zero counts rather than hiding the categories.
 */
export async function loadCategoryDirectory(): Promise<CategoryDirectoryResult> {
  try {
    const database = getDatabase();
    const [rows, counts] = await Promise.all([
      database
        .select({
          slug: category.slug,
          name: category.name,
          welshLabel: category.welshLabel,
          description: category.description,
        })
        .from(category)
        .where(eq(category.status, "active"))
        .orderBy(asc(category.name))
        .limit(100),
      listCategoriesWithPublishedBusinesses({ limit: 100 }),
    ]);
    const countBySlug = new Map(counts.map((item) => [item.slug, item.count]));
    return {
      state: "ready",
      categories: rows.map((row) => ({
        ...row,
        businesses: countBySlug.get(row.slug) ?? 0,
      })),
    };
  } catch {
    return { state: "unavailable", categories: [] };
  }
}
