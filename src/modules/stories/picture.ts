import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { localStory } from "@/lib/database/schema/local-stories";
import {
  isMediaStorageConfigured,
  publicMediaUrl,
  putMediaObject,
} from "@/lib/media-storage";
import { deleteStoredObjectOrQueue } from "@/lib/storage-cleanup";
import { inspectImageUpload } from "@/modules/businesses/media-validation";
import { cleanImageAlt, STORY_IMAGE_ALT_MIN } from "./model";

/**
 * A story's one optional picture. It lives on the story row (storage key, alt
 * text, size) rather than in `business_media`, because a story belongs to the
 * platform, not to a business. Only admins reach these functions (the actions
 * check the admin session first).
 */
export type StoryPictureResult =
  | { status: "saved" }
  | { status: "invalid"; message: string }
  | { status: "not_found" }
  | { status: "disabled" }
  | { status: "unavailable" };

export function storyPictureUrl(storageKey: string | null): string | null {
  return storageKey ? publicMediaUrl(storageKey) : null;
}

export async function saveStoryPicture(input: {
  storyId: unknown;
  contentType: string;
  bytes: Buffer;
  alt: unknown;
  altCy: unknown;
}): Promise<StoryPictureResult> {
  const id = z.uuid().safeParse(input.storyId);
  if (!id.success) return { status: "not_found" };
  if (!isMediaStorageConfigured()) return { status: "disabled" };

  const inspected = inspectImageUpload(input.bytes, input.contentType);
  if (inspected.status === "invalid") return inspected;
  const alt = cleanImageAlt(input.alt);
  if (alt.length < STORY_IMAGE_ALT_MIN) {
    return {
      status: "invalid",
      message: "Describe the picture for screen-reader users.",
    };
  }
  const altCy = cleanImageAlt(input.altCy);

  const storageKey = `stories/${id.data}/${randomUUID()}.${inspected.image.extension}`;
  let uploaded = false;
  try {
    const database = getDatabase();
    const [existing] = await database
      .select({ key: localStory.imageStorageKey })
      .from(localStory)
      .where(eq(localStory.id, id.data))
      .limit(1);
    if (!existing) return { status: "not_found" };

    await putMediaObject(storageKey, input.bytes, inspected.image.contentType);
    uploaded = true;
    const [updated] = await database
      .update(localStory)
      .set({
        imageStorageKey: storageKey,
        imageAlt: alt,
        imageAltCy: altCy || null,
        imageContentType: inspected.image.contentType,
        imageByteSize: input.bytes.byteLength,
      })
      .where(
        and(
          eq(localStory.id, id.data),
          // Only replace the picture that was read: a concurrent change wins
          // and this upload's file is discarded, so no file is orphaned.
          sql`${localStory.imageStorageKey} is not distinct from ${existing.key}`,
        ),
      )
      .returning({ id: localStory.id });
    if (!updated) {
      await deleteStoredObjectOrQueue(storageKey);
      return { status: "unavailable" };
    }
    // The previous file is retired only once nothing points at it.
    if (existing.key) await deleteStoredObjectOrQueue(existing.key);
    return { status: "saved" };
  } catch {
    if (uploaded) await deleteStoredObjectOrQueue(storageKey);
    return { status: "unavailable" };
  }
}

/** Edits the descriptions of the current picture without uploading a new one. */
export async function updateStoryPictureAlt(input: {
  storyId: unknown;
  alt: unknown;
  altCy: unknown;
}): Promise<StoryPictureResult> {
  const id = z.uuid().safeParse(input.storyId);
  if (!id.success) return { status: "not_found" };
  const alt = cleanImageAlt(input.alt);
  if (alt.length < STORY_IMAGE_ALT_MIN) {
    return {
      status: "invalid",
      message: "Describe the picture for screen-reader users.",
    };
  }
  const altCy = cleanImageAlt(input.altCy);
  try {
    const updated = await getDatabase()
      .update(localStory)
      .set({ imageAlt: alt, imageAltCy: altCy || null })
      .where(
        and(eq(localStory.id, id.data), isNotNull(localStory.imageStorageKey)),
      )
      .returning({ key: localStory.imageStorageKey });
    // No row, or a row with no picture: nothing to describe.
    return updated[0]?.key ? { status: "saved" } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function removeStoryPicture(
  rawId: unknown,
): Promise<StoryPictureResult> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { status: "not_found" };
  try {
    const database = getDatabase();
    const [existing] = await database
      .select({ key: localStory.imageStorageKey })
      .from(localStory)
      .where(eq(localStory.id, id.data))
      .limit(1);
    if (!existing?.key) return { status: "not_found" };
    const cleared = await database
      .update(localStory)
      .set({
        imageStorageKey: null,
        imageAlt: null,
        imageAltCy: null,
        imageContentType: null,
        imageByteSize: null,
      })
      .where(
        and(
          eq(localStory.id, id.data),
          eq(localStory.imageStorageKey, existing.key),
        ),
      )
      .returning({ id: localStory.id });
    // Someone changed the picture meanwhile: leave their file alone.
    if (cleared.length === 0) return { status: "unavailable" };
    await deleteStoredObjectOrQueue(existing.key);
    return { status: "saved" };
  } catch {
    return { status: "unavailable" };
  }
}
