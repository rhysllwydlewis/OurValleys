import "server-only";
import { and, asc, eq, lte, notInArray } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { localStory } from "@/lib/database/schema/local-stories";
import { assessStory } from "./model";

const batchSize = 100;
/** Batches per run, so one run cannot loop for long. */
const maxRounds = 10;

export type ScheduledStoriesResult = {
  /** Stories made public by this run. */
  published: number;
  /** Stories that no longer pass the publishing checks and went back to draft. */
  returnedToDraft: number;
  /** Stories that could not be handled this time and will be tried again. */
  failed: number;
};

/**
 * Makes every scheduled story whose time has come public. Run by the worker
 * every few minutes. Each story is handled in its own transaction and re-read
 * with `for update`, so an admin who unschedules, edits or publishes it at the
 * same moment wins cleanly and nothing is published twice. `publishedAt` is the
 * moment of publishing, not the planned time. A story that has somehow fallen
 * below the publishing bar is returned to draft instead of going live.
 */
export async function publishDueStories(
  now: Date = new Date(),
): Promise<ScheduledStoriesResult> {
  const database = getDatabase();
  const result: ScheduledStoriesResult = {
    published: 0,
    returnedToDraft: 0,
    failed: 0,
  };
  const tried = new Set<string>();
  for (let round = 0; round < maxRounds; round += 1) {
    const due = await database
      .select({ id: localStory.id })
      .from(localStory)
      .where(
        and(
          eq(localStory.status, "scheduled"),
          lte(localStory.scheduledFor, now),
          tried.size > 0 ? notInArray(localStory.id, [...tried]) : undefined,
        ),
      )
      .orderBy(asc(localStory.scheduledFor), asc(localStory.id))
      .limit(batchSize);
    if (due.length === 0) break;
    for (const row of due) {
      tried.add(row.id);
      const outcome = await publishOne(row.id, now);
      if (outcome === "published") result.published += 1;
      else if (outcome === "draft") result.returnedToDraft += 1;
      else if (outcome === "failed") result.failed += 1;
    }
    if (due.length < batchSize) break;
  }
  return result;
}

async function publishOne(
  id: string,
  now: Date,
): Promise<"published" | "draft" | "skipped" | "failed"> {
  try {
    return await getDatabase().transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(localStory)
        .where(eq(localStory.id, id))
        .for("update");
      if (
        !current ||
        current.status !== "scheduled" ||
        !current.scheduledFor ||
        current.scheduledFor.getTime() > now.getTime()
      ) {
        return "skipped" as const;
      }
      if (!assessStory(current).canPublish) {
        await transaction
          .update(localStory)
          .set({ status: "draft", scheduledFor: null })
          .where(eq(localStory.id, id));
        return "draft" as const;
      }
      await transaction
        .update(localStory)
        .set({
          status: "published",
          publishedAt: now,
          scheduledFor: null,
        })
        .where(eq(localStory.id, id));
      return "published" as const;
    });
  } catch {
    return "failed";
  }
}
