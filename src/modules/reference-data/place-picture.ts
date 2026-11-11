import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { placeProfile } from "@/lib/database/schema/reference";
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
  cleanPlacePictureAlt,
  cleanPlacePictureCredit,
  placePictureProblem,
  type PlacePictureView,
} from "./place-picture-model";

/**
 * The editorial picture of a place (doc 98). It lives on the place's profile
 * row (storage key, descriptions, credit) rather than in `business_media`,
 * because a place belongs to the platform, not to a business. Only admins reach
 * the write functions: the server actions check the admin session first.
 */
export type PlacePictureResult =
  | { status: "saved" }
  | { status: "invalid"; message: string }
  | { status: "not_found" }
  | { status: "disabled" }
  | { status: "unavailable" };

const ALT_MESSAGE = "Describe the picture for screen-reader users.";

function toView(row: {
  key: string | null;
  alt: string | null;
  altCy: string | null;
  credit: string | null;
}): PlacePictureView | null {
  if (!row.key || !row.alt) return null;
  const url = publicMediaUrl(row.key);
  if (!url) return null;
  return { url, alt: row.alt, altCy: row.altCy, credit: row.credit };
}

/** The public picture of one place, or `null` (none, storage off, or database down). */
export const getPlacePicture = cache(async function getPlacePicture(
  placeId: string,
): Promise<PlacePictureView | null> {
  try {
    const [row] = await getDatabase()
      .select({
        key: placeProfile.imageStorageKey,
        alt: placeProfile.imageAlt,
        altCy: placeProfile.imageAltCy,
        credit: placeProfile.imageCredit,
      })
      .from(placeProfile)
      .where(eq(placeProfile.placeId, placeId))
      .limit(1);
    return row ? toView(row) : null;
  } catch {
    return null;
  }
});

type PictureRow = {
  placeId: string;
  key: string | null;
  alt: string | null;
  altCy: string | null;
  credit: string | null;
};

async function loadPictureRows(): Promise<PictureRow[]> {
  return getDatabase()
    .select({
      placeId: placeProfile.placeId,
      key: placeProfile.imageStorageKey,
      alt: placeProfile.imageAlt,
      altCy: placeProfile.imageAltCy,
      credit: placeProfile.imageCredit,
    })
    .from(placeProfile)
    .innerJoin(place, eq(place.id, placeProfile.placeId))
    .where(
      and(isNotNull(placeProfile.imageStorageKey), eq(place.status, "active")),
    );
}

/**
 * Public editorial data only, so one shared entry is safe. A failed load
 * throws and is therefore never cached; saving or removing a picture drops it
 * via the "business-directory" tag.
 */
const cachedPictureRows = unstable_cache(
  loadPictureRows,
  ["public-place-picture-rows"],
  { revalidate: 60, tags: ["business-directory"] },
);

/** Pictures for the directory tiles: one cached query for the whole site. */
export const listPlacePictures = cache(
  async function listPlacePictures(): Promise<Map<string, PlacePictureView>> {
    const pictures = new Map<string, PlacePictureView>();
    try {
      for (const row of await cachedPictureRows()) {
        const view = toView(row);
        if (view) pictures.set(row.placeId, view);
      }
    } catch {
      // The directory simply shows no pictures.
    }
    return pictures;
  },
);

/** Admin view: the stored picture even when storage is not configured. */
export async function getPlacePictureForAdmin(placeId: string): Promise<{
  picture: PlacePictureView | null;
  stored: boolean;
  storageReady: boolean;
}> {
  const empty = {
    picture: null,
    stored: false,
    storageReady: isMediaStorageConfigured(),
  };
  if (!z.uuid().safeParse(placeId).success) return empty;
  try {
    const [row] = await getDatabase()
      .select({
        key: placeProfile.imageStorageKey,
        alt: placeProfile.imageAlt,
        altCy: placeProfile.imageAltCy,
        credit: placeProfile.imageCredit,
      })
      .from(placeProfile)
      .where(eq(placeProfile.placeId, placeId))
      .limit(1);
    if (!row?.key) return empty;
    return { ...empty, picture: toView(row), stored: true };
  } catch {
    return empty;
  }
}

/**
 * Adds or replaces the picture. The profile row is created when the place has
 * none yet; an unknown place never creates an orphan row.
 */
export async function savePlacePicture(input: {
  placeId: unknown;
  contentType: string;
  bytes: Buffer;
  alt: unknown;
  altCy: unknown;
  credit: unknown;
  actorUserId: string | null;
}): Promise<PlacePictureResult> {
  const id = z.uuid().safeParse(input.placeId);
  if (!id.success) return { status: "not_found" };
  if (!isMediaStorageConfigured()) return { status: "disabled" };

  const inspected = inspectImageUpload(input.bytes, input.contentType);
  if (inspected.status === "invalid") return inspected;
  if (placePictureProblem({ alt: input.alt })) {
    return { status: "invalid", message: ALT_MESSAGE };
  }
  const alt = cleanPlacePictureAlt(input.alt);
  const altCy = cleanPlacePictureAlt(input.altCy) || null;
  const credit = cleanPlacePictureCredit(input.credit);

  const storageKey = `places/${id.data}/${randomUUID()}.${inspected.image.extension}`;
  let uploaded = false;
  try {
    const database = getDatabase();
    const [target] = await database
      .select({ key: placeProfile.imageStorageKey, id: place.id })
      .from(place)
      .leftJoin(placeProfile, eq(placeProfile.placeId, place.id))
      .where(eq(place.id, id.data))
      .limit(1);
    if (!target) return { status: "not_found" };

    await putMediaObject(storageKey, input.bytes, inspected.image.contentType);
    uploaded = true;
    const columns = {
      imageStorageKey: storageKey,
      imageAlt: alt,
      imageAltCy: altCy,
      imageCredit: credit,
      imageContentType: inspected.image.contentType,
      imageByteSize: input.bytes.byteLength,
      updatedByUserId: input.actorUserId,
    };
    // The retired key joins the cleanup queue in the same transaction that
    // stops naming it, so a crash can never leave the file unreachable and
    // undeletable.
    const saved = await database.transaction(async (transaction) => {
      const rows = await transaction
        .insert(placeProfile)
        .values({ placeId: id.data, ...columns })
        .onConflictDoUpdate({
          target: placeProfile.placeId,
          set: { ...columns, updatedAt: new Date() },
          // Only replace the picture that was read: a concurrent change wins
          // and this upload's file is discarded, so no file is orphaned.
          setWhere: sql`${placeProfile.imageStorageKey} is not distinct from ${target.key}`,
        })
        .returning({ placeId: placeProfile.placeId });
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
export async function updatePlacePictureText(input: {
  placeId: unknown;
  alt: unknown;
  altCy: unknown;
  credit: unknown;
  actorUserId: string | null;
}): Promise<PlacePictureResult> {
  const id = z.uuid().safeParse(input.placeId);
  if (!id.success) return { status: "not_found" };
  if (placePictureProblem({ alt: input.alt })) {
    return { status: "invalid", message: ALT_MESSAGE };
  }
  try {
    const updated = await getDatabase()
      .update(placeProfile)
      .set({
        imageAlt: cleanPlacePictureAlt(input.alt),
        imageAltCy: cleanPlacePictureAlt(input.altCy) || null,
        imageCredit: cleanPlacePictureCredit(input.credit),
        updatedByUserId: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(placeProfile.placeId, id.data),
          isNotNull(placeProfile.imageStorageKey),
        ),
      )
      .returning({ key: placeProfile.imageStorageKey });
    // No row, or a row with no picture: nothing to describe.
    return updated[0]?.key ? { status: "saved" } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function removePlacePicture(
  rawId: unknown,
  actorUserId: string | null,
): Promise<PlacePictureResult> {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { status: "not_found" };
  try {
    const database = getDatabase();
    const [existing] = await database
      .select({ key: placeProfile.imageStorageKey })
      .from(placeProfile)
      .where(eq(placeProfile.placeId, id.data))
      .limit(1);
    if (!existing?.key) return { status: "not_found" };
    const cleared = await database.transaction(async (transaction) => {
      const rows = await transaction
        .update(placeProfile)
        .set({
          imageStorageKey: null,
          imageAlt: null,
          imageAltCy: null,
          imageCredit: null,
          imageContentType: null,
          imageByteSize: null,
          updatedByUserId: actorUserId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(placeProfile.placeId, id.data),
            eq(placeProfile.imageStorageKey, existing.key as string),
          ),
        )
        .returning({ placeId: placeProfile.placeId });
      if (rows.length > 0) {
        await enqueueStorageCleanup(transaction, [existing.key as string]);
      }
      return rows;
    });
    // Someone changed the picture meanwhile: leave their file alone.
    if (cleared.length === 0) return { status: "unavailable" };
    await processStorageCleanup({ storageKeys: [existing.key] });
    return { status: "saved" };
  } catch {
    return { status: "unavailable" };
  }
}
