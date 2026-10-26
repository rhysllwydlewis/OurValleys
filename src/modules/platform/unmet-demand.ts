import "server-only";
import { count, desc, gte, max, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  searchZeroResult,
  unmetDemandDismissal,
} from "@/lib/database/schema/business-operations";
import {
  isUnmetDemandDismissed,
  unmetDemandKey,
  type UnmetDemandDismissalStatus,
  type UnmetDemandRow,
  type UnmetDemandWindow,
} from "./unmet-demand-shared";

const ROW_LIMIT = 100;
// Fetch extra so dismissed rows do not leave the list short.
const FETCH_LIMIT = 400;

/**
 * Searches that matched nothing, grouped by case- and whitespace-insensitive
 * text plus the category and place filters, so the same unmet demand typed
 * slightly differently counts once. Rows an admin has dismissed stay hidden
 * until they are searched for again. Admin-only: callers sit under the
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
    .limit(FETCH_LIMIT);

  const dismissals = await getDatabase()
    .select({
      demandKey: unmetDemandDismissal.demandKey,
      dismissedAt: unmetDemandDismissal.dismissedAt,
    })
    .from(unmetDemandDismissal);
  const dismissedAt = new Map(
    dismissals.map((entry) => [entry.demandKey, entry.dismissedAt]),
  );

  return rows
    .map((row) => ({ ...row, lastSeen: row.lastSeen ?? since }))
    .filter(
      (row) =>
        !isUnmetDemandDismissed(row, dismissedAt.get(unmetDemandKey(row))),
    )
    .slice(0, ROW_LIMIT);
}

/**
 * Records that an admin has dealt with one grouped row. The key is rebuilt
 * from the three grouping fields, so the caller cannot dismiss anything other
 * than a (text, category, place) combination.
 */
export async function dismissUnmetDemand(input: {
  queryText: string | null;
  categorySlug: string | null;
  placeSlug: string | null;
  status: UnmetDemandDismissalStatus;
  adminUserId: string | null;
}): Promise<void> {
  const demandKey = unmetDemandKey(input);
  const now = new Date();
  await getDatabase()
    .insert(unmetDemandDismissal)
    .values({
      queryText: input.queryText,
      categorySlug: input.categorySlug,
      placeSlug: input.placeSlug,
      demandKey,
      status: input.status,
      dismissedByUserId: input.adminUserId,
      dismissedAt: now,
    })
    .onConflictDoUpdate({
      target: unmetDemandDismissal.demandKey,
      set: {
        status: input.status,
        dismissedByUserId: input.adminUserId,
        dismissedAt: now,
      },
    });
}
