import "server-only";
import { and, asc, eq, gt, lte, notInArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  businessUpdate,
  businessUpdatePublish,
} from "@/lib/database/schema/business-operations";
import { updateLimits } from "./updates-model";

const batchSize = 200;
/** Batches per run, so one run cannot loop for long. */
const maxRounds = 10;

export type ScheduledUpdatesResult = {
  /** Updates made public by this run. */
  published: number;
  /** Updates that could not be published this time and will be tried again. */
  failed: number;
  /** Due updates left scheduled because the business is at its daily limit. */
  deferred: number;
};

/**
 * Makes every scheduled update whose time has come public. Run by the worker
 * every few minutes, so an update appears within minutes of its chosen time.
 *
 * Each update is handled in its own transaction under the business's updates
 * lock and re-read with `for update`, so an owner who withdraws, edits or
 * publishes it at the same moment wins cleanly and nothing is published twice.
 * `publishedAt` is the moment of publishing (not the planned time) so followers'
 * notices, which look at recent publishes, never miss it. The daily publish
 * limit applies here too: a business that has already published its daily
 * allowance keeps its due updates scheduled until the window frees a place, so
 * scheduling cannot be used to get round the limit.
 */
export async function publishDueUpdates(
  now: Date = new Date(),
): Promise<ScheduledUpdatesResult> {
  const database = getDatabase();
  let published = 0;
  let failed = 0;
  let deferred = 0;
  // Businesses at their daily limit and rows already tried are left out of the
  // next batch, so a full batch of deferred rows cannot hide later due updates.
  const blockedBusinesses = new Set<string>();
  const tried = new Set<string>();
  for (let round = 0; round < maxRounds; round += 1) {
    const due = await database
      .select({ id: businessUpdate.id, businessId: businessUpdate.businessId })
      .from(businessUpdate)
      .where(
        and(
          eq(businessUpdate.status, "scheduled"),
          lte(businessUpdate.scheduledFor, now),
          blockedBusinesses.size > 0
            ? notInArray(businessUpdate.businessId, [...blockedBusinesses])
            : undefined,
          tried.size > 0
            ? notInArray(businessUpdate.id, [...tried])
            : undefined,
        ),
      )
      .orderBy(asc(businessUpdate.scheduledFor), asc(businessUpdate.id))
      .limit(batchSize);
    if (due.length === 0) break;
    for (const row of due) {
      tried.add(row.id);
      const outcome = await publishOne(row, now);
      if (outcome === "published") published += 1;
      else if (outcome === "failed") failed += 1;
      else if (outcome === "deferred") {
        deferred += 1;
        blockedBusinesses.add(row.businessId);
      }
    }
    if (due.length < batchSize) break;
  }
  return { published, failed, deferred };
}

async function publishOne(
  row: { id: string; businessId: string },
  now: Date,
): Promise<"published" | "failed" | "deferred" | "skipped"> {
  try {
    return await getDatabase().transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${row.businessId}:updates`}))`,
      );
      const [current] = await transaction
        .select({
          status: businessUpdate.status,
          scheduledFor: businessUpdate.scheduledFor,
        })
        .from(businessUpdate)
        .where(eq(businessUpdate.id, row.id))
        .for("update");
      if (
        !current ||
        current.status !== "scheduled" ||
        !current.scheduledFor ||
        current.scheduledFor.getTime() > now.getTime()
      ) {
        return "skipped" as const;
      }
      const [recent] = await transaction
        .select({ count: sql<number>`count(*)::int` })
        .from(businessUpdatePublish)
        .where(
          and(
            eq(businessUpdatePublish.businessId, row.businessId),
            gt(
              businessUpdatePublish.publishedAt,
              new Date(now.getTime() - 86_400_000),
            ),
          ),
        );
      if ((recent?.count ?? 0) >= updateLimits.publishesPerDay) {
        return "deferred" as const;
      }
      await transaction
        .update(businessUpdate)
        .set({
          status: "published",
          publishedAt: now,
          scheduledFor: null,
          updatedAt: sql`now()`,
        })
        .where(eq(businessUpdate.id, row.id));
      await transaction
        .insert(businessUpdatePublish)
        .values({ businessId: row.businessId, publishedAt: now });
      return "published" as const;
    });
  } catch {
    return "failed";
  }
}
