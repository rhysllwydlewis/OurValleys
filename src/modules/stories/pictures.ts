import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { localStory } from "@/lib/database/schema/local-stories";
import { isMediaStorageConfigured, putMediaObject } from "@/lib/media-storage";
import { deleteStoredObjectOrQueue } from "@/lib/storage-cleanup";
import { inspectImageUpload } from "@/modules/businesses/media-validation";
import { STORY_IMAGE_ALT_MAX, STORY_IMAGE_ALT_MIN } from "./model";

export type StoryPictureResult =
  | { status: "saved" }
  | { status: "removed" }
  | { status: "invalid"; message: string }
  | { status: "not_found" }
  | { status: "disabled" }
  | { status: "unavailable" };

function cleanAlt(value: string): string {
  return value.trim().slice(0, STORY_IMAGE_ALT_MAX);
}

/**
 * Stores a picture for a story and points the story at it. The story's old
 * picture, if any, is deleted once the new one is saved. The file lives under
 * a story-owned key, so it can never be mistaken for a business's media.
 */
export async function setStoryPicture(input: {
  storyId: unknown;
  contentType: string;
  bytes: Buffer;
  altText: string;
}): Promise<StoryPictureResult> {
  const id = z.uuid().safeParse(input.storyId);
  if (!id.success) return { status: "not_found" };
  if (!isMediaStorageConfigured()) return { status: "disabled" };

  const inspected = inspectImageUpload(input.bytes, input.contentType);
  if (inspected.status === "invalid") return inspected;

  const altText = cleanAlt(input.altText);
  if (altText.length < STORY_IMAGE_ALT_MIN) {
    return {
      status: "invalid",
      message: "Describe the picture for screen-reader users.",
    };
  }

  const storageKey = `stories/${id.data}/${randomUUID()}.${inspected.image.extension}`;
  let uploaded = false;
  try {
    await putMediaObject(storageKey, input.bytes, inspected.image.contentType);
    uploaded = true;
    const outcome = await getDatabase().transaction(async (transaction) => {
      const [current] = await transaction
        .select({ imageKey: localStory.imageKey })
        .from(localStory)
        .where(eq(localStory.id, id.data))
        .for("update");
      if (!current) return { status: "not_found" as const };
      await transaction
        .update(localStory)
        .set({
          imageKey: storageKey,
          imageContentType: inspected.image.contentType,
          imageAlt: altText,
        })
        .where(eq(localStory.id, id.data));
      return { status: "saved" as const, previousKey: current.imageKey };
    });
    if (outcome.status !== "saved") {
      await deleteStoredObjectOrQueue(storageKey);
      return outcome;
    }
    if (outcome.previousKey)
      await deleteStoredObjectOrQueue(outcome.previousKey);
    return { status: "saved" };
  } catch {
    if (uploaded) await deleteStoredObjectOrQueue(storageKey);
    return { status: "unavailable" };
  }
}

/** Changes the description of the current picture without replacing the file. */
export async function setStoryPictureAlt(
  rawId: unknown,
  rawAlt: string,
): Promise<StoryPictureResult> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { status: "not_found" };
  const altText = cleanAlt(rawAlt);
  if (altText.length < STORY_IMAGE_ALT_MIN) {
    return {
      status: "invalid",
      message: "Describe the picture for screen-reader users.",
    };
  }
  try {
    const updated = await getDatabase().transaction(async (transaction) => {
      const [current] = await transaction
        .select({ imageKey: localStory.imageKey })
        .from(localStory)
        .where(eq(localStory.id, id.data))
        .for("update");
      if (!current?.imageKey) return false;
      await transaction
        .update(localStory)
        .set({ imageAlt: altText })
        .where(eq(localStory.id, id.data));
      return true;
    });
    return updated ? { status: "saved" } : { status: "not_found" };
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
    const previousKey = await getDatabase().transaction(async (transaction) => {
      const [current] = await transaction
        .select({ imageKey: localStory.imageKey })
        .from(localStory)
        .where(eq(localStory.id, id.data))
        .for("update");
      if (!current?.imageKey) return null;
      await transaction
        .update(localStory)
        .set({ imageKey: null, imageContentType: null, imageAlt: null })
        .where(eq(localStory.id, id.data));
      return current.imageKey;
    });
    if (!previousKey) return { status: "not_found" };
    await deleteStoredObjectOrQueue(previousKey);
    return { status: "removed" };
  } catch {
    return { status: "unavailable" };
  }
}
