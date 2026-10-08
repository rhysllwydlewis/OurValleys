import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessMedia } from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
} from "@/lib/database/schema/business-operations";
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
import { inspectImageUpload } from "./media-validation";

/**
 * Pictures for special offers and events (docs/32 §11.1, §11.2). They are
 * `business_media` rows with their own roles so they never appear in the
 * website gallery (`listBusinessMedia` only returns logo, hero and gallery),
 * and an offer or event points at its picture through `image_media_id`.
 */
export const contentImageKinds = ["offer", "event"] as const;
export type ContentImageKind = (typeof contentImageKinds)[number];

/**
 * Upper bound on active pictures per business and kind. It is deliberately a
 * little above the free allowance of active offers and events, because drafts
 * and past events may keep their picture, and it stops uploads being used as
 * free file storage.
 */
export const contentImageLimits: Record<ContentImageKind, number> = {
  offer: 30,
  event: 60,
};

export function isContentImageKind(value: string): value is ContentImageKind {
  return (contentImageKinds as readonly string[]).includes(value);
}

export type ContentImageView = {
  id: string;
  url: string;
  altText: string;
};

export type SaveContentImageResult =
  | { status: "saved"; mediaId: string }
  | { status: "invalid"; message: string }
  | { status: "limit" }
  | { status: "disabled" }
  | { status: "unavailable" };

/**
 * Stores an uploaded picture and returns its media id; does not attach it.
 *
 * `replacingMediaId` is the picture the upload is about to replace. It does not
 * count towards the allowance, so an owner who is at the limit can still swap a
 * picture, but only when this replacement will actually retire it: a picture
 * still used by other dates of a repeating event stays, so it keeps counting.
 */
export async function saveContentImage(input: {
  businessId: string;
  kind: ContentImageKind;
  contentType: string;
  bytes: Buffer;
  altText: string;
  replacingMediaId?: string | null;
}): Promise<SaveContentImageResult> {
  if (!isMediaStorageConfigured()) return { status: "disabled" };

  const inspected = inspectImageUpload(input.bytes, input.contentType);
  if (inspected.status === "invalid") return inspected;

  const altText = input.altText.trim().slice(0, 300);
  if (altText.length < 3) {
    return {
      status: "invalid",
      message: "Describe the picture for screen-reader users.",
    };
  }

  const storageKey = `business/${input.businessId}/${input.kind}/${randomUUID()}.${inspected.image.extension}`;
  let uploaded = false;

  try {
    await putMediaObject(storageKey, input.bytes, inspected.image.contentType);
    uploaded = true;

    const database = getDatabase();
    const outcome = await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:media`}))`,
      );
      const [stats] = await transaction
        .select({ activeCount: sql<number>`count(*)::int` })
        .from(businessMedia)
        .where(
          and(
            eq(businessMedia.businessId, input.businessId),
            eq(businessMedia.role, input.kind),
            eq(businessMedia.status, "active"),
          ),
        );
      let activeCount = stats?.activeCount ?? 0;
      if (input.replacingMediaId) {
        const [replaced] = await transaction
          .select({ id: businessMedia.id })
          .from(businessMedia)
          .where(
            and(
              eq(businessMedia.id, input.replacingMediaId),
              eq(businessMedia.businessId, input.businessId),
              eq(businessMedia.role, input.kind),
              eq(businessMedia.status, "active"),
            ),
          );
        if (replaced) {
          const [offers, events] = await Promise.all([
            transaction
              .select({ count: sql<number>`count(*)::int` })
              .from(businessOffer)
              .where(eq(businessOffer.imageMediaId, replaced.id)),
            transaction
              .select({ count: sql<number>`count(*)::int` })
              .from(businessEvent)
              .where(eq(businessEvent.imageMediaId, replaced.id)),
          ]);
          const uses = (offers[0]?.count ?? 0) + (events[0]?.count ?? 0);
          if (uses <= 1) activeCount -= 1;
        }
      }
      if (activeCount >= contentImageLimits[input.kind]) {
        return { status: "limit" as const };
      }
      const [row] = await transaction
        .insert(businessMedia)
        .values({
          businessId: input.businessId,
          role: input.kind,
          storageKey,
          altText,
          contentType: inspected.image.contentType,
          byteSize: input.bytes.byteLength,
        })
        .returning({ id: businessMedia.id });
      return row
        ? { status: "saved" as const, mediaId: row.id }
        : { status: "unavailable" as const };
    });

    // The file was stored before the limit was checked, so do not keep it.
    if (outcome.status !== "saved") await deleteStoredObjectOrQueue(storageKey);
    return outcome;
  } catch {
    if (uploaded) await deleteStoredObjectOrQueue(storageKey);
    return { status: "unavailable" };
  }
}

/** The picture an offer or event currently shows, read for the owner's own business. */
export async function currentContentImageId(input: {
  businessId: string;
  kind: ContentImageKind;
  itemId: string;
}): Promise<string | null> {
  try {
    const database = getDatabase();
    if (input.kind === "offer") {
      const [row] = await database
        .select({ id: businessOffer.imageMediaId })
        .from(businessOffer)
        .where(
          and(
            eq(businessOffer.id, input.itemId),
            eq(businessOffer.businessId, input.businessId),
          ),
        );
      return row?.id ?? null;
    }
    const [row] = await database
      .select({ id: businessEvent.imageMediaId })
      .from(businessEvent)
      .where(
        and(
          eq(businessEvent.id, input.itemId),
          eq(businessEvent.businessId, input.businessId),
        ),
      );
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * True only for an active picture of this kind that belongs to this business.
 * Attaching a picture must always pass this, so an offer or event can never
 * point at another business's media.
 */
export async function isOwnContentImage(input: {
  businessId: string;
  kind: ContentImageKind;
  mediaId: string;
}): Promise<boolean> {
  try {
    const [row] = await getDatabase()
      .select({ id: businessMedia.id })
      .from(businessMedia)
      .where(
        and(
          eq(businessMedia.id, input.mediaId),
          eq(businessMedia.businessId, input.businessId),
          eq(businessMedia.role, input.kind),
          eq(businessMedia.status, "active"),
        ),
      )
      .limit(1);
    return Boolean(row);
  } catch {
    return false;
  }
}

/**
 * Retires a picture once no offer or event references it any more (the dates
 * of a repeating event share one picture). Call it after the referencing row
 * has been updated or deleted. Failures are swallowed: an unreferenced picture
 * is harmless and must never fail the owner's save.
 */
export async function releaseContentImageIfUnused(input: {
  businessId: string;
  mediaId: string | null | undefined;
}): Promise<void> {
  if (!input.mediaId) return;
  const mediaId = input.mediaId;
  try {
    const database = getDatabase();
    const storageKey = await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:media`}))`,
      );
      const [offers, events] = await Promise.all([
        transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(businessOffer)
          .where(eq(businessOffer.imageMediaId, mediaId)),
        transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(businessEvent)
          .where(eq(businessEvent.imageMediaId, mediaId)),
      ]);
      if ((offers[0]?.count ?? 0) + (events[0]?.count ?? 0) > 0) return null;
      const [retired] = await transaction
        .update(businessMedia)
        .set({ status: "removed", updatedAt: sql`now()` })
        .where(
          and(
            eq(businessMedia.id, mediaId),
            eq(businessMedia.businessId, input.businessId),
            eq(businessMedia.status, "active"),
            inArray(businessMedia.role, [...contentImageKinds]),
          ),
        )
        .returning({ storageKey: businessMedia.storageKey });
      if (retired)
        await enqueueStorageCleanup(transaction, [retired.storageKey]);
      return retired?.storageKey ?? null;
    });
    if (storageKey) await processStorageCleanup({ storageKeys: [storageKey] });
  } catch {
    // Leaving an unreferenced picture behind is harmless.
  }
}

/** Loads the public view of several pictures at once; unknown ids are absent. */
export async function loadContentImages(
  mediaIds: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, ContentImageView>> {
  const ids = [...new Set(mediaIds.filter((id): id is string => Boolean(id)))];
  const images = new Map<string, ContentImageView>();
  if (ids.length === 0) return images;
  try {
    const rows = await getDatabase()
      .select({
        id: businessMedia.id,
        storageKey: businessMedia.storageKey,
        altText: businessMedia.altText,
      })
      .from(businessMedia)
      .where(
        and(
          inArray(businessMedia.id, ids),
          eq(businessMedia.status, "active"),
          inArray(businessMedia.role, [...contentImageKinds]),
        ),
      );
    for (const row of rows) {
      const url = publicMediaUrl(row.storageKey);
      if (url) images.set(row.id, { id: row.id, url, altText: row.altText });
    }
  } catch {
    // Pictures are decoration: a failure shows the item without one.
  }
  return images;
}
