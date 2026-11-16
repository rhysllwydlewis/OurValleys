import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import {
  isMediaStorageConfigured,
  publicMediaUrl,
  putMediaObject,
} from "@/lib/media-storage";
import {
  deleteStoredObjectOrQueue,
  enqueueStorageCleanup,
  processStorageCleanup,
} from "@/lib/storage-cleanup";
import { inspectImageUpload } from "@/modules/businesses/media-validation";
import {
  cleanGuidePictureAlt,
  cleanGuidePictureCredit,
  guidePictureFromColumns,
  guidePictureProblem,
  type GuidePictureView,
} from "./guide-picture-model";

/**
 * A guide's own editorial picture (doc 118). It lives on the guide row
 * (storage key, descriptions, credit), because a guide belongs to the
 * platform, not to a business. Only admins reach the write functions: the
 * server actions check the admin session first.
 *
 * None of these functions touch `guide.updated_at`. That column is the version
 * of the guide's words (the studio refuses a save over a newer one, and it is
 * the article's "updated" date), so changing a picture must neither invalidate
 * an editor's open draft nor claim the text was revised.
 */
export type GuidePictureResult =
  | { status: "saved" }
  | { status: "invalid"; message: string }
  | { status: "not_found" }
  | { status: "disabled" }
  | { status: "unavailable" };

const ALT_MESSAGE = "Describe the picture for screen-reader users.";

/** The columns every public guide read selects to build its picture. */
export const guidePictureColumns = {
  imageKey: guide.imageStorageKey,
  imageAlt: guide.imageAlt,
  imageAltCy: guide.imageAltCy,
  imageCredit: guide.imageCredit,
};

/** Stored columns to the public view, using the configured media host. */
export function toGuidePicture(row: {
  imageKey: string | null;
  imageAlt: string | null;
  imageAltCy: string | null;
  imageCredit: string | null;
}): GuidePictureView | null {
  return guidePictureFromColumns(row, (key) => publicMediaUrl(key));
}

/** Admin view: the stored picture even when storage is not configured. */
export async function getGuidePictureForAdmin(guideId: unknown): Promise<{
  picture: GuidePictureView | null;
  stored: boolean;
  storageReady: boolean;
}> {
  const empty = {
    picture: null,
    stored: false,
    storageReady: isMediaStorageConfigured(),
  };
  const id = z.uuid().safeParse(guideId);
  if (!id.success) return empty;
  try {
    const [row] = await getDatabase()
      .select(guidePictureColumns)
      .from(guide)
      .where(eq(guide.id, id.data))
      .limit(1);
    if (!row?.imageKey) return empty;
    return { ...empty, picture: toGuidePicture(row), stored: true };
  } catch {
    return empty;
  }
}

/** Adds or replaces the picture of an existing guide (any status). */
export async function saveGuidePicture(input: {
  guideId: unknown;
  contentType: string;
  bytes: Buffer;
  alt: unknown;
  altCy: unknown;
  credit: unknown;
}): Promise<GuidePictureResult> {
  const id = z.uuid().safeParse(input.guideId);
  if (!id.success) return { status: "not_found" };
  if (!isMediaStorageConfigured()) return { status: "disabled" };

  const inspected = inspectImageUpload(input.bytes, input.contentType);
  if (inspected.status === "invalid") return inspected;
  if (guidePictureProblem({ alt: input.alt })) {
    return { status: "invalid", message: ALT_MESSAGE };
  }

  const storageKey = `guides/${id.data}/${randomUUID()}.${inspected.image.extension}`;
  let uploaded = false;
  try {
    const database = getDatabase();
    const [target] = await database
      .select({ key: guide.imageStorageKey })
      .from(guide)
      .where(eq(guide.id, id.data))
      .limit(1);
    // An unknown guide never gets a file.
    if (!target) return { status: "not_found" };

    await putMediaObject(storageKey, input.bytes, inspected.image.contentType);
    uploaded = true;
    // The retired key joins the cleanup queue in the same transaction that
    // stops naming it, so a crash can never leave the file unreachable and
    // undeletable.
    const saved = await database.transaction(async (transaction) => {
      const rows = await transaction
        .update(guide)
        .set({
          imageStorageKey: storageKey,
          imageAlt: cleanGuidePictureAlt(input.alt),
          imageAltCy: cleanGuidePictureAlt(input.altCy) || null,
          imageCredit: cleanGuidePictureCredit(input.credit),
          imageContentType: inspected.image.contentType,
          imageByteSize: input.bytes.byteLength,
        })
        .where(
          and(
            eq(guide.id, id.data),
            // Only replace the picture that was read: a concurrent change
            // wins and this upload's file is discarded, so none is orphaned.
            sql`${guide.imageStorageKey} is not distinct from ${target.key}`,
          ),
        )
        .returning({ id: guide.id });
      if (rows.length > 0 && target.key) {
        await enqueueStorageCleanup(transaction, [target.key]);
      }
      return rows;
    });
    if (saved.length === 0) {
      await deleteStoredObjectOrQueue(storageKey);
      return { status: "unavailable" };
    }
    // The previous file is deleted only once nothing points at it.
    if (target.key) await processStorageCleanup({ storageKeys: [target.key] });
    return { status: "saved" };
  } catch {
    if (uploaded) await deleteStoredObjectOrQueue(storageKey);
    return { status: "unavailable" };
  }
}

/** Edits the descriptions and credit of the current picture, without a new file. */
export async function updateGuidePictureText(input: {
  guideId: unknown;
  alt: unknown;
  altCy: unknown;
  credit: unknown;
}): Promise<GuidePictureResult> {
  const id = z.uuid().safeParse(input.guideId);
  if (!id.success) return { status: "not_found" };
  if (guidePictureProblem({ alt: input.alt })) {
    return { status: "invalid", message: ALT_MESSAGE };
  }
  try {
    const updated = await getDatabase()
      .update(guide)
      .set({
        imageAlt: cleanGuidePictureAlt(input.alt),
        imageAltCy: cleanGuidePictureAlt(input.altCy) || null,
        imageCredit: cleanGuidePictureCredit(input.credit),
      })
      .where(and(eq(guide.id, id.data), isNotNull(guide.imageStorageKey)))
      .returning({ key: guide.imageStorageKey });
    // No guide, or a guide with no picture: nothing to describe.
    return updated[0]?.key ? { status: "saved" } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function removeGuidePicture(
  rawId: unknown,
): Promise<GuidePictureResult> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { status: "not_found" };
  try {
    const database = getDatabase();
    const [existing] = await database
      .select({ key: guide.imageStorageKey })
      .from(guide)
      .where(eq(guide.id, id.data))
      .limit(1);
    const key = existing?.key;
    if (!key) return { status: "not_found" };
    const cleared = await database.transaction(async (transaction) => {
      const rows = await transaction
        .update(guide)
        .set({
          imageStorageKey: null,
          imageAlt: null,
          imageAltCy: null,
          imageCredit: null,
          imageContentType: null,
          imageByteSize: null,
        })
        .where(and(eq(guide.id, id.data), eq(guide.imageStorageKey, key)))
        .returning({ id: guide.id });
      if (rows.length > 0) await enqueueStorageCleanup(transaction, [key]);
      return rows;
    });
    // Someone changed the picture meanwhile: leave their file alone.
    if (cleared.length === 0) return { status: "unavailable" };
    await processStorageCleanup({ storageKeys: [key] });
    return { status: "saved" };
  } catch {
    return { status: "unavailable" };
  }
}
