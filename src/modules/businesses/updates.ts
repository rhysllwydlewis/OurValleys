import "server-only";
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  businessUpdate,
  businessUpdatePublish,
} from "@/lib/database/schema/business-operations";
import {
  updateLimits,
  type ParsedUpdateForm,
  type StudioUpdate,
  type UpdateIntent,
  type UpdateStatus,
} from "./updates-model";

export type StudioUpdatesResult =
  { status: "ok"; updates: StudioUpdate[] } | { status: "unavailable" };

function toStudioUpdate(row: typeof businessUpdate.$inferSelect): StudioUpdate {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    titleCy: row.titleCy,
    bodyCy: row.bodyCy,
    status:
      row.status === "published" || row.status === "removed"
        ? row.status
        : "draft",
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Every update of one business, with a plain "unavailable" when the read
 * fails so the studio never mistakes an outage for "no updates yet".
 */
export async function listStudioUpdates(
  businessId: string,
): Promise<StudioUpdatesResult> {
  try {
    const rows = await getDatabase()
      .select()
      .from(businessUpdate)
      .where(eq(businessUpdate.businessId, businessId))
      .orderBy(desc(businessUpdate.updatedAt))
      .limit(updateLimits.maxUpdates);
    return { status: "ok", updates: rows.map(toStudioUpdate) };
  } catch {
    return { status: "unavailable" };
  }
}

export type SaveUpdateResult =
  "saved" | "not_found" | "stale" | "limit" | "rate" | "locked" | "unavailable";

export type SaveUpdateOutcome = {
  result: SaveUpdateResult;
  id?: string;
  /** The state the update ended in, when saved. */
  status?: UpdateStatus;
  /** True when this save made the update public for the first time. */
  newlyPublished?: boolean;
};

const lockKey = (businessId: string) => `${businessId}:updates`;

/**
 * Publishes made in the last 24 hours. Counted from the publish log, which
 * survives deleting, withdrawing and re-posting an update.
 */
async function recentPublishCount(
  transaction: Pick<ReturnType<typeof getDatabase>, "select">,
  businessId: string,
  now: Date,
): Promise<number> {
  const since = new Date(now.getTime() - 86_400_000);
  const [row] = await transaction
    .select({ count: sql<number>`count(*)::int` })
    .from(businessUpdatePublish)
    .where(
      and(
        eq(businessUpdatePublish.businessId, businessId),
        gt(businessUpdatePublish.publishedAt, since),
      ),
    );
  return row?.count ?? 0;
}

async function logPublish(
  transaction: Pick<ReturnType<typeof getDatabase>, "insert">,
  businessId: string,
  now: Date,
) {
  await transaction
    .insert(businessUpdatePublish)
    .values({ businessId, publishedAt: now });
}

/**
 * Creates or edits one update from an already-validated form. An edit
 * carries the `updatedAt` the form was built from; if someone else saved
 * since, nothing is overwritten. Everything is scoped by `businessId`, so
 * another business's update id is "not_found". Publishing is limited per
 * business per day under a per-business advisory lock.
 */
export async function saveStudioUpdate(input: {
  businessId: string;
  updateId?: string;
  expectedUpdatedAt?: number;
  update: Extract<ParsedUpdateForm, { ok: true }>["update"];
  intent: UpdateIntent;
  now?: Date;
}): Promise<SaveUpdateOutcome> {
  const now = input.now ?? new Date();
  try {
    return await getDatabase().transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${lockKey(input.businessId)}))`,
      );
      const wantsPublish = input.intent === "publish";
      if (!input.updateId) {
        const [counted] = await transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(businessUpdate)
          .where(eq(businessUpdate.businessId, input.businessId));
        if ((counted?.count ?? 0) >= updateLimits.maxUpdates) {
          return { result: "limit" as const };
        }
        if (
          wantsPublish &&
          (await recentPublishCount(transaction, input.businessId, now)) >=
            updateLimits.publishesPerDay
        ) {
          return { result: "rate" as const };
        }
        const [created] = await transaction
          .insert(businessUpdate)
          .values({
            businessId: input.businessId,
            ...input.update,
            status: wantsPublish ? "published" : "draft",
            publishedAt: wantsPublish ? now : null,
          })
          .returning({ id: businessUpdate.id });
        if (wantsPublish) await logPublish(transaction, input.businessId, now);
        return {
          result: "saved" as const,
          id: created?.id,
          status: wantsPublish ? ("published" as const) : ("draft" as const),
          newlyPublished: wantsPublish,
        };
      }
      const [previous] = await transaction
        .select()
        .from(businessUpdate)
        .where(
          and(
            eq(businessUpdate.id, input.updateId),
            eq(businessUpdate.businessId, input.businessId),
          ),
        )
        .for("update");
      if (!previous) return { result: "not_found" as const };
      // An administrator took this update down; the owner cannot change it.
      if (previous.status === "removed") return { result: "locked" as const };
      if (
        input.expectedUpdatedAt !== undefined &&
        previous.updatedAt.getTime() !== input.expectedUpdatedAt
      ) {
        return { result: "stale" as const };
      }
      const wasPublished = previous.status === "published";
      const publishNow = wantsPublish && !wasPublished;
      if (
        publishNow &&
        (await recentPublishCount(transaction, input.businessId, now)) >=
          updateLimits.publishesPerDay
      ) {
        return { result: "rate" as const };
      }
      const status: UpdateStatus =
        wasPublished || wantsPublish ? "published" : "draft";
      if (publishNow) await logPublish(transaction, input.businessId, now);
      await transaction
        .update(businessUpdate)
        .set({
          ...input.update,
          status,
          publishedAt: publishNow ? now : previous.publishedAt,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(businessUpdate.id, input.updateId),
            eq(businessUpdate.businessId, input.businessId),
          ),
        );
      return {
        result: "saved" as const,
        id: previous.id,
        status,
        newlyPublished: publishNow,
      };
    });
  } catch {
    return { result: "unavailable" };
  }
}

export type UpdateStateResult =
  "done" | "not_found" | "rate" | "unchanged" | "locked" | "unavailable";

/**
 * Publishes or unpublishes one update, decided against the locked row. An
 * unpublished update goes back to a draft; it keeps its text and, if it is
 * published again, gets a fresh date so it appears as new.
 */
export async function setStudioUpdateState(input: {
  businessId: string;
  updateId: string;
  to: UpdateStatus;
  now?: Date;
}): Promise<UpdateStateResult> {
  const now = input.now ?? new Date();
  try {
    return await getDatabase().transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${lockKey(input.businessId)}))`,
      );
      const [previous] = await transaction
        .select({ status: businessUpdate.status })
        .from(businessUpdate)
        .where(
          and(
            eq(businessUpdate.id, input.updateId),
            eq(businessUpdate.businessId, input.businessId),
          ),
        )
        .for("update");
      if (!previous) return "not_found" as const;
      if (previous.status === "removed") return "locked" as const;
      if (previous.status === input.to) return "unchanged" as const;
      if (
        input.to === "published" &&
        (await recentPublishCount(transaction, input.businessId, now)) >=
          updateLimits.publishesPerDay
      ) {
        return "rate" as const;
      }
      await transaction
        .update(businessUpdate)
        .set(
          input.to === "published"
            ? { status: "published", publishedAt: now, updatedAt: sql`now()` }
            : { status: "draft", publishedAt: null, updatedAt: sql`now()` },
        )
        .where(
          and(
            eq(businessUpdate.id, input.updateId),
            eq(businessUpdate.businessId, input.businessId),
          ),
        );
      if (input.to === "published") {
        await logPublish(transaction, input.businessId, now);
      }
      return "done" as const;
    });
  } catch {
    return "unavailable";
  }
}

export async function removeStudioUpdate(input: {
  businessId: string;
  updateId: string;
}): Promise<"removed" | "not_found" | "unavailable"> {
  try {
    // An update an administrator took down stays on record, so it cannot be
    // deleted to hide that it was reported.
    const removed = await getDatabase()
      .delete(businessUpdate)
      .where(
        and(
          eq(businessUpdate.id, input.updateId),
          eq(businessUpdate.businessId, input.businessId),
          ne(businessUpdate.status, "removed"),
        ),
      )
      .returning({ id: businessUpdate.id });
    return removed.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}
