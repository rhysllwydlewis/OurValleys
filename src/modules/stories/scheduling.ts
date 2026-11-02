import "server-only";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { localStory } from "@/lib/database/schema/local-stories";
import { assessStory } from "./model";

const batchSize = 100;

export type ScheduledStoriesResult = {
  /** Stories made public by this run. */
  published: number;
  /** Due stories no longer fit to publish; moved back to draft for an admin. */
  returnedToDraft: number;
};

/**
 * Makes every scheduled story whose time has come public. Run by the worker
 * every few minutes. Each story is claimed with one conditional update on
 * `status = 'scheduled'`, so an admin who moves it to draft, archives it or
 * publishes it at the same moment wins cleanly and nothing is published twice.
 * `publishedAt` is the moment of publishing, so the story sorts as newest.
 * A due story that no longer passes the publishing bar (it cannot normally be
 * saved that way) goes back to draft rather than going live.
 */
export async function publishDueStories(
  now: Date = new Date(),
): Promise<ScheduledStoriesResult> {
  const database = getDatabase();
  let published = 0;
  let returnedToDraft = 0;
  const due = await database
    .select()
    .from(localStory)
    .where(
      and(
        eq(localStory.status, "scheduled"),
        lte(localStory.scheduledFor, now),
      ),
    )
    .orderBy(asc(localStory.scheduledFor), asc(localStory.id))
    .limit(batchSize);
  for (const story of due) {
    const ready = assessStory(story).canPublish;
    const claimed = await database
      .update(localStory)
      .set(
        ready
          ? { status: "published", publishedAt: now, scheduledFor: null }
          : { status: "draft", scheduledFor: null },
      )
      .where(
        and(
          eq(localStory.id, story.id),
          eq(localStory.status, "scheduled"),
          lte(localStory.scheduledFor, now),
          // The version that was assessed: an edit in between waits a run.
          sql`date_trunc('milliseconds', ${localStory.updatedAt}) = ${story.updatedAt.toISOString()}::timestamptz`,
        ),
      )
      .returning({ id: localStory.id });
    if (claimed.length === 0) continue;
    if (ready) published += 1;
    else returnedToDraft += 1;
  }
  return { published, returnedToDraft };
}
