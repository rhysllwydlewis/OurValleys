import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { localStory } from "@/lib/database/schema/local-stories";
import {
  assessStory,
  createStoryInputSchema,
  describeStoryIssues,
  updateStoryInputSchema,
  type StoryStatus,
} from "./model";

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
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminStoryListResult =
  | { state: "ready"; stories: AdminStory[] }
  | { state: "unavailable"; stories: [] };

function toAdminStory(row: typeof localStory.$inferSelect): AdminStory {
  const { authorUserId: _author, ...rest } = row;
  void _author;
  return { ...rest, status: row.status as StoryStatus };
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
  authorUserId: string,
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
      .select({ status: localStory.status })
      .from(localStory)
      .where(eq(localStory.id, id))
      .limit(1);
    // A live story must keep passing the blocking checks, or an edit could
    // quietly take it below the publishing bar.
    if (existingRow?.status === "published") {
      if (!assessStory(fields).canPublish) {
        return {
          status: "invalid",
          issues: [
            "This story is published, so it needs at least two paragraphs and a summary that differs from the headline. Move it to draft to change it further.",
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
  "updated" | "not_found" | "invalid" | "not_ready" | "unavailable";

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
    return checkedAt ? "unavailable" : "not_found";
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
      .returning({ id: localStory.id });
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
