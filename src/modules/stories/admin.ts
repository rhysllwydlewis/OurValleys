import "server-only";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { localStory } from "@/lib/database/schema/local-stories";
import { deleteStoredObjectOrQueue } from "@/lib/storage-cleanup";
import {
  assessStory,
  createStoryInputSchema,
  describeStoryIssues,
  parseStorySchedule,
  scheduleErrorText,
  STORY_MAX_SCHEDULED,
  updateStoryInputSchema,
  type StoryStatus,
} from "./model";
import { storyPictureUrl } from "./picture";

export type AdminStory = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  titleCy: string;
  summaryCy: string;
  bodyCy: string;
  placeId: string | null;
  authorName: string;
  sponsorshipDisclosure: string | null;
  status: StoryStatus;
  /** Set only while the story is scheduled. */
  scheduledFor: Date | null;
  image: { url: string | null; alt: string; altCy: string } | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminStoryListResult =
  | { state: "ready"; stories: AdminStory[] }
  | { state: "unavailable"; stories: [] };

function toAdminStory(row: typeof localStory.$inferSelect): AdminStory {
  const {
    authorUserId: _author,
    imageStorageKey,
    imageAlt,
    imageAltCy,
    imageContentType: _type,
    imageByteSize: _size,
    ...rest
  } = row;
  void _author;
  void _type;
  void _size;
  return {
    ...rest,
    status: row.status as StoryStatus,
    image: imageStorageKey
      ? {
          url: storyPictureUrl(imageStorageKey),
          alt: imageAlt ?? "",
          altCy: imageAltCy ?? "",
        }
      : null,
  };
}

export async function listStoriesForAdmin(): Promise<AdminStoryListResult> {
  try {
    const rows = await getDatabase()
      .select()
      .from(localStory)
      .orderBy(desc(localStory.updatedAt))
      .limit(500);
    return { state: "ready", stories: rows.map(toAdminStory) };
  } catch {
    return { state: "unavailable", stories: [] };
  }
}

export async function getStoryForAdmin(
  rawId: unknown,
): Promise<AdminStory | null> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return null;
  try {
    const [row] = await getDatabase()
      .select()
      .from(localStory)
      .where(eq(localStory.id, id.data))
      .limit(1);
    return row ? toAdminStory(row) : null;
  } catch {
    return null;
  }
}

export type MutateStoryResult =
  | { status: "created"; id: string; updatedAt: string }
  | { status: "updated"; updatedAt: string }
  | { status: "not_found" }
  | { status: "duplicate_slug" }
  | { status: "conflict" }
  | { status: "invalid"; issues: string[] }
  | { status: "unavailable" };

export async function createStoryForAdmin(
  rawInput: unknown,
  authorUserId: string | null,
): Promise<MutateStoryResult> {
  const parsed = createStoryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "invalid",
      issues: describeStoryIssues(parsed.error.issues),
    };
  }
  try {
    const [created] = await getDatabase()
      .insert(localStory)
      .values({ ...parsed.data, authorUserId })
      .returning({ id: localStory.id, updatedAt: localStory.updatedAt });
    return created
      ? {
          status: "created",
          id: created.id,
          updatedAt: created.updatedAt.toISOString(),
        }
      : { status: "unavailable" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_slug" };
    if (isForeignKeyViolation(error)) {
      return { status: "invalid", issues: ["Place: choose a listed place."] };
    }
    return { status: "unavailable" };
  }
}

export async function updateStoryForAdmin(
  rawInput: unknown,
): Promise<MutateStoryResult> {
  const parsed = updateStoryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "invalid",
      issues: describeStoryIssues(parsed.error.issues),
    };
  }
  try {
    const database = getDatabase();
    const { id, expectedUpdatedAt, ...fields } = parsed.data;
    const [existingRow] = await database
      .select({ status: localStory.status, slug: localStory.slug })
      .from(localStory)
      .where(eq(localStory.id, id))
      .limit(1);
    // A live story must keep passing the blocking checks, or an edit could
    // quietly take it below the publishing bar.
    if (
      existingRow?.status === "published" ||
      existingRow?.status === "scheduled"
    ) {
      if (
        existingRow.status === "published" &&
        fields.slug !== existingRow.slug
      ) {
        return {
          status: "invalid",
          issues: [
            "This story is published, so its web address cannot change: links already shared would stop working. Move it to draft first.",
          ],
        };
      }
      if (!assessStory(fields).canPublish) {
        return {
          status: "invalid",
          issues: [
            "This story is published or scheduled, so it needs at least two paragraphs and a summary that differs from the headline. Move it to draft to change it further.",
          ],
        };
      }
    }
    const savedAt = new Date();
    const [updated] = await database
      .update(localStory)
      .set({ ...fields, updatedAt: savedAt })
      .where(
        and(
          eq(localStory.id, id),
          existingRow ? eq(localStory.status, existingRow.status) : undefined,
          sql`date_trunc('milliseconds', ${localStory.updatedAt}) = ${expectedUpdatedAt}::timestamptz`,
        ),
      )
      .returning({ id: localStory.id });
    if (updated) return { status: "updated", updatedAt: savedAt.toISOString() };
    const [existing] = await database
      .select({ id: localStory.id })
      .from(localStory)
      .where(eq(localStory.id, id))
      .limit(1);
    return existing ? { status: "conflict" } : { status: "not_found" };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate_slug" };
    if (isForeignKeyViolation(error)) {
      return { status: "invalid", issues: ["Place: choose a listed place."] };
    }
    return { status: "unavailable" };
  }
}

export type SetStoryStatusResult =
  | "updated"
  | "not_found"
  | "invalid"
  | "not_ready"
  | "conflict"
  | "limit"
  | `schedule_${keyof typeof scheduleErrorText}`
  | "unavailable";

/**
 * A status change leaves `updatedAt` alone: it records when the words last
 * changed, which the public page shows and the editor's stale-save check uses.
 */
async function setStoryStatus(
  rawId: unknown,
  status: StoryStatus,
): Promise<SetStoryStatusResult> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return "invalid";
  try {
    const database = getDatabase();
    let checkedAt: string | null = null;
    if (status === "published") {
      const [current] = await database
        .select()
        .from(localStory)
        .where(eq(localStory.id, id.data))
        .limit(1);
      if (!current) return "not_found";
      if (!assessStory(current).canPublish) return "not_ready";
      checkedAt = current.updatedAt.toISOString();
    }
    const [updated] = await database
      .update(localStory)
      .set({
        status,
        scheduledFor: null,
        // A story's date is when it last went live.
        publishedAt: status === "published" ? new Date() : null,
      })
      .where(
        and(
          eq(localStory.id, id.data),
          // Publish only the version that was checked.
          checkedAt
            ? sql`date_trunc('milliseconds', ${localStory.updatedAt}) = ${checkedAt}::timestamptz`
            : undefined,
        ),
      )
      .returning({ id: localStory.id });
    if (updated) return "updated";
    // An edit landed after the checks ran: the new text must be looked at first.
    return checkedAt ? "conflict" : "not_found";
  } catch {
    return "unavailable";
  }
}

/**
 * Holds a ready draft until a chosen UK time; the worker then publishes it.
 * Scheduling again moves the time. Only the version that was checked is
 * scheduled, like publishing. A scheduled story is private until it goes live.
 */
export async function scheduleStoryForAdmin(
  rawId: unknown,
  rawTime: unknown,
  now: Date = new Date(),
): Promise<SetStoryStatusResult> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return "invalid";
  const time = parseStorySchedule(rawTime, now);
  if (!time.ok) return `schedule_${time.error}`;
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      // One schedule change at a time, so the waiting-stories cap holds.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext('stories:schedule'))`,
      );
      const [current] = await transaction
        .select()
        .from(localStory)
        .where(eq(localStory.id, id.data))
        .limit(1);
      if (!current) return "not_found" as const;
      if (current.status !== "draft" && current.status !== "scheduled") {
        return "invalid" as const;
      }
      if (!assessStory(current).canPublish) return "not_ready" as const;
      if (current.status === "draft") {
        const [waiting] = await transaction
          .select({ total: count() })
          .from(localStory)
          .where(
            and(
              eq(localStory.status, "scheduled"),
              ne(localStory.id, current.id),
            ),
          );
        if ((waiting?.total ?? 0) >= STORY_MAX_SCHEDULED) {
          return "limit" as const;
        }
      }
      const changed = await transaction
        .update(localStory)
        .set({
          status: "scheduled",
          scheduledFor: time.scheduledFor,
          publishedAt: null,
        })
        .where(
          and(
            eq(localStory.id, current.id),
            // The version that was checked, still a draft or scheduled.
            eq(localStory.status, current.status),
            sql`date_trunc('milliseconds', ${localStory.updatedAt}) = ${current.updatedAt.toISOString()}::timestamptz`,
          ),
        )
        .returning({ id: localStory.id });
      return changed.length > 0 ? ("updated" as const) : ("conflict" as const);
    });
  } catch {
    return "unavailable";
  }
}

export const publishStoryForAdmin = (id: unknown) =>
  setStoryStatus(id, "published");
export const archiveStoryForAdmin = (id: unknown) =>
  setStoryStatus(id, "archived");
export const revertStoryToDraftForAdmin = (id: unknown) =>
  setStoryStatus(id, "draft");

export async function deleteStoryForAdmin(
  rawId: unknown,
): Promise<"deleted" | "not_found" | "invalid" | "unavailable"> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return "invalid";
  try {
    const deleted = await getDatabase()
      .delete(localStory)
      .where(and(eq(localStory.id, id.data), eq(localStory.status, "draft")))
      .returning({ id: localStory.id, imageKey: localStory.imageStorageKey });
    // The picture file goes with the story; storage trouble is retried later.
    if (deleted[0]?.imageKey)
      await deleteStoredObjectOrQueue(deleted[0].imageKey);
    return deleted.length > 0 ? "deleted" : "not_found";
  } catch {
    return "unavailable";
  }
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return errorCode(candidate.cause);
}

function isUniqueViolation(error: unknown): boolean {
  return errorCode(error) === "23505";
}

function isForeignKeyViolation(error: unknown): boolean {
  return errorCode(error) === "23503";
}
