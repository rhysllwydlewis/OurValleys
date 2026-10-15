import "server-only";

import { and, asc, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { savedSearch } from "@/lib/database/schema/saved-search";
import {
  MAX_SAVED_SEARCHES,
  newResultCount,
  parseSavedSearchInput,
  savedSearchHref,
} from "./saved-search-model";
import {
  parseSearchType,
  type SearchType,
} from "@/modules/search/search-filters";
import { searchSite } from "@/modules/search/site-search";

const identifierSchema = z.uuid();

export type SavedSearchMutationResult =
  | "saved"
  | "already_saved"
  | "removed"
  | "not_found"
  | "limit"
  | "invalid"
  | "unavailable";

export type SavedSearchSummary = {
  id: string;
  query: string;
  queryKey: string;
  type: SearchType;
  href: string;
  savedAt: Date;
  lastSeenAt: Date;
  /** Results right now; null when they could not be counted. */
  total: number | null;
  /** Results beyond what the resident last looked at; null when unknown. */
  newCount: number | null;
};

export type SavedSearchesResult =
  | { state: "ready"; searches: SavedSearchSummary[] }
  | { state: "unavailable"; searches: [] };

/** How many results a search has in the tab the resident saved it from. */
async function countResults(
  query: string,
  type: SearchType,
): Promise<number | null> {
  const result = await searchSite(query, { type });
  if (result.state !== "ready") return null;
  return type === "all" ? result.total : result.counts[type];
}

export async function saveSearchForUser(
  userId: string,
  rawQuery: unknown,
  rawType: unknown,
): Promise<SavedSearchMutationResult> {
  if (!identifierSchema.safeParse(userId).success) return "invalid";
  const input = parseSavedSearchInput(rawQuery, rawType);
  if (!input) return "invalid";

  try {
    const database = getDatabase();
    const [existing] = await database
      .select({ id: savedSearch.id })
      .from(savedSearch)
      .where(
        and(
          eq(savedSearch.userId, userId),
          eq(savedSearch.queryKey, input.queryKey),
          eq(savedSearch.type, input.type),
        ),
      )
      .limit(1);
    if (existing) return "already_saved";

    // The baseline is what the resident is looking at as they save, so the
    // first "new" count only reflects results that arrive afterwards. Counted
    // before the transaction so the lock is not held during a slow search.
    const total = await countResults(input.query, input.type);
    if (total === null) return "unavailable";

    // One resident's saves are serialised so parallel requests cannot pass
    // the limit together.
    return await database.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`saved-search:${userId}`}))`,
      );
      const [owned] = await tx
        .select({ value: count() })
        .from(savedSearch)
        .where(eq(savedSearch.userId, userId));
      if ((owned?.value ?? 0) >= MAX_SAVED_SEARCHES) return "limit" as const;
      const rows = await tx
        .insert(savedSearch)
        .values({
          userId,
          query: input.query,
          queryKey: input.queryKey,
          type: input.type,
          lastSeenTotal: total,
        })
        .onConflictDoNothing()
        .returning({ id: savedSearch.id });
      return rows.length > 0 ? ("saved" as const) : ("already_saved" as const);
    });
  } catch {
    return "unavailable";
  }
}

export async function removeSavedSearchForUser(
  userId: string,
  searchId: string,
): Promise<SavedSearchMutationResult> {
  if (
    !identifierSchema.safeParse(userId).success ||
    !identifierSchema.safeParse(searchId).success
  ) {
    return "invalid";
  }
  try {
    const rows = await getDatabase()
      .delete(savedSearch)
      .where(and(eq(savedSearch.id, searchId), eq(savedSearch.userId, userId)))
      .returning({ id: savedSearch.id });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

/**
 * Marks a saved search as looked at (its baseline becomes today's count) and
 * returns the address to open. Null when it is not this resident's search.
 */
export async function openSavedSearchForUser(
  userId: string,
  searchId: string,
): Promise<string | null> {
  if (
    !identifierSchema.safeParse(userId).success ||
    !identifierSchema.safeParse(searchId).success
  ) {
    return null;
  }
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        query: savedSearch.query,
        type: savedSearch.type,
      })
      .from(savedSearch)
      .where(and(eq(savedSearch.id, searchId), eq(savedSearch.userId, userId)))
      .limit(1);
    if (!row) return null;
    const type = parseSearchType(row.type);
    const total = await countResults(row.query, type);
    if (total !== null) {
      await database
        .update(savedSearch)
        .set({ lastSeenTotal: total, lastSeenAt: new Date() })
        .where(
          and(eq(savedSearch.id, searchId), eq(savedSearch.userId, userId)),
        );
    }
    return savedSearchHref({ query: row.query, type });
  } catch {
    return null;
  }
}

/** The searches a resident kept, oldest first, each with how many results are new. */
export async function listSavedSearchesForUser(
  userId: string,
  options: { withCounts?: boolean } = {},
): Promise<SavedSearchesResult> {
  if (!identifierSchema.safeParse(userId).success) {
    return { state: "ready", searches: [] };
  }
  try {
    const rows = await getDatabase()
      .select()
      .from(savedSearch)
      .where(eq(savedSearch.userId, userId))
      .orderBy(asc(savedSearch.createdAt))
      .limit(MAX_SAVED_SEARCHES);

    const searches: SavedSearchSummary[] = rows.map((row) => {
      const type = parseSearchType(row.type);
      return {
        id: row.id,
        query: row.query,
        queryKey: row.queryKey,
        type,
        href: savedSearchHref({ query: row.query, type }),
        savedAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
        total: null,
        newCount: null,
      };
    });

    if (options.withCounts) {
      // A few at a time: each count is a full site search.
      for (let start = 0; start < searches.length; start += 4) {
        await Promise.all(
          searches.slice(start, start + 4).map(async (item, offset) => {
            const total = await countResults(item.query, item.type).catch(
              () => null,
            );
            const row = rows[start + offset]!;
            item.total = total;
            item.newCount =
              total === null ? null : newResultCount(total, row.lastSeenTotal);
            // Results that went away lower the baseline, so ones that come
            // back later count as new.
            if (total !== null && total < row.lastSeenTotal) {
              await getDatabase()
                .update(savedSearch)
                .set({ lastSeenTotal: total })
                .where(
                  and(
                    eq(savedSearch.id, row.id),
                    eq(savedSearch.userId, userId),
                  ),
                )
                .catch(() => undefined);
            }
          }),
        );
      }
    }
    return { state: "ready", searches };
  } catch {
    return { state: "unavailable", searches: [] };
  }
}
