import "server-only";
import { count, desc, gte, max, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { searchZeroResult } from "@/lib/database/schema/business-operations";
import {
  type UnmetDemandRow,
  type UnmetDemandWindow,
} from "./unmet-demand-shared";

const ROW_LIMIT = 100;

/**
 * Searches that matched nothing, grouped by case- and whitespace-insensitive
 * text plus the category and place filters, so the same unmet demand typed
 * slightly differently counts once. Admin-only: callers sit under the
 * `/admin` layout, which enforces platform-admin access and MFA.
 */
export async function listUnmetDemand(
  windowDays: UnmetDemandWindow,
  now: Date = new Date(),
): Promise<UnmetDemandRow[]> {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const normalisedText = sql<
    string | null
  >`nullif(lower(btrim(regexp_replace(${searchZeroResult.queryText}, '\\s+', ' ', 'g'))), '')`;
  const occurrences = count();
  const lastSeen = max(searchZeroResult.occurredAt);

  const rows = await getDatabase()
    .select({
      queryText: normalisedText,
      categorySlug: searchZeroResult.categorySlug,
      placeSlug: searchZeroResult.placeSlug,
      occurrences,
      lastSeen,
    })
    .from(searchZeroResult)
    .where(gte(searchZeroResult.occurredAt, since))
    .groupBy(
      normalisedText,
      searchZeroResult.categorySlug,
      searchZeroResult.placeSlug,
    )
    .orderBy(desc(occurrences), desc(lastSeen))
    .limit(ROW_LIMIT);

  return rows.map((row) => ({
    ...row,
    lastSeen: row.lastSeen ?? since,
  }));
}
