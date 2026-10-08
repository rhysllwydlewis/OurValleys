import "server-only";
import { and, asc, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { storageCleanup } from "@/lib/database/schema/storage-cleanup";
import {
  deleteMediaObject,
  isMediaStorageConfigured,
} from "@/lib/media-storage";

/** Anything that can run an insert: the database or a transaction on it. */
type InsertExecutor = Pick<ReturnType<typeof getDatabase>, "insert">;

/**
 * Records storage objects that must be deleted. Call it inside the transaction
 * that retires or deletes the rows naming them, so a crash between "row gone"
 * and "file deleted" can never lose the key.
 */
export async function enqueueStorageCleanup(
  executor: InsertExecutor,
  storageKeys: readonly string[],
): Promise<void> {
  const keys = [...new Set(storageKeys.filter((key) => key.length > 0))];
  if (keys.length === 0) return;
  await executor
    .insert(storageCleanup)
    .values(keys.map((storageKey) => ({ storageKey })))
    // A storage key is a fresh UUID path, so a repeat is the same object.
    .onConflictDoNothing({ target: storageCleanup.storageKey });
}

export type StorageCleanupResult = {
  attempted: number;
  deleted: number;
  failed: number;
  skipped: boolean;
};

/**
 * Deletes queued objects from storage and marks them done. Failures stay
 * queued with a bumped attempt count and are retried by the next run. Never
 * throws: callers use it after their own work has committed.
 *
 * `storageKeys` limits the run to those keys (used right after a change so the
 * file goes immediately); without it the oldest pending objects are processed.
 */
export async function processStorageCleanup(
  options: { storageKeys?: readonly string[]; limit?: number } = {},
): Promise<StorageCleanupResult> {
  const result: StorageCleanupResult = {
    attempted: 0,
    deleted: 0,
    failed: 0,
    skipped: false,
  };
  if (!isMediaStorageConfigured()) {
    // Without storage credentials nothing can be deleted; keep everything queued.
    return { ...result, skipped: true };
  }

  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: storageCleanup.id,
        storageKey: storageCleanup.storageKey,
      })
      .from(storageCleanup)
      .where(
        and(
          isNull(storageCleanup.deletedAt),
          options.storageKeys
            ? inArray(storageCleanup.storageKey, [...options.storageKeys])
            : undefined,
        ),
      )
      .orderBy(asc(storageCleanup.queuedAt))
      .limit(options.limit ?? 100);

    for (const row of rows) {
      result.attempted += 1;
      try {
        await deleteMediaObject(row.storageKey);
        await database
          .update(storageCleanup)
          .set({ deletedAt: sql`now()`, lastAttemptAt: sql`now()` })
          .where(inArray(storageCleanup.id, [row.id]));
        result.deleted += 1;
      } catch {
        await database
          .update(storageCleanup)
          .set({
            attempts: sql`${storageCleanup.attempts} + 1`,
            lastAttemptAt: sql`now()`,
          })
          .where(inArray(storageCleanup.id, [row.id]))
          .catch(() => undefined);
        result.failed += 1;
      }
    }
  } catch {
    // The queue is durable; the next run picks up whatever is left.
  }
  return result;
}

/** Drops completed rows after a month so the table stays small. */
export async function purgeCompletedStorageCleanup(
  now = new Date(),
): Promise<number> {
  try {
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const removed = await getDatabase()
      .delete(storageCleanup)
      .where(lt(storageCleanup.deletedAt, cutoff))
      .returning({ id: storageCleanup.id });
    return removed.length;
  } catch {
    return 0;
  }
}

/**
 * Deletes an object that no row names (a failed upload, an upload that lost a
 * race). If storage refuses, the key is queued so the worker retries it
 * instead of leaving the file behind.
 */
export async function deleteStoredObjectOrQueue(
  storageKey: string,
): Promise<void> {
  try {
    await deleteMediaObject(storageKey);
  } catch {
    try {
      await enqueueStorageCleanup(getDatabase(), [storageKey]);
    } catch {
      // Nothing more can be done from here; the object is unreferenced.
    }
  }
}
