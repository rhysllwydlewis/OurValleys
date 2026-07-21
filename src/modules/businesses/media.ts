import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessMedia } from "@/lib/database/schema/business";
import {
  deleteMediaObject,
  isMediaStorageConfigured,
  publicMediaUrl,
  putMediaObject,
} from "@/lib/media-storage";

/** Free-tier media allowance (docs/32 §23 recommended defaults). */
export const mediaLimits = { logo: 1, hero: 1, gallery: 12 } as const;

export type BusinessMediaRole = keyof typeof mediaLimits;

export const allowedImageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const maxImageBytes = 5 * 1024 * 1024;

export type BusinessMediaItem = {
  id: string;
  role: BusinessMediaRole;
  url: string;
  altText: string;
};

export function isMediaRole(value: string): value is BusinessMediaRole {
  return value in mediaLimits;
}

export async function listBusinessMedia(businessId: string): Promise<{
  logo: BusinessMediaItem | null;
  hero: BusinessMediaItem | null;
  gallery: BusinessMediaItem[];
}> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: businessMedia.id,
        role: businessMedia.role,
        storageKey: businessMedia.storageKey,
        altText: businessMedia.altText,
      })
      .from(businessMedia)
      .where(
        and(
          eq(businessMedia.businessId, businessId),
          eq(businessMedia.status, "active"),
        ),
      )
      .orderBy(asc(businessMedia.sortOrder), asc(businessMedia.createdAt));

    const items = rows.flatMap((row) => {
      const url = publicMediaUrl(row.storageKey);
      if (!url || !isMediaRole(row.role)) return [];
      return [{ id: row.id, role: row.role, url, altText: row.altText }];
    });

    return {
      logo: items.find((item) => item.role === "logo") ?? null,
      hero: items.find((item) => item.role === "hero") ?? null,
      gallery: items.filter((item) => item.role === "gallery"),
    };
  } catch {
    return { logo: null, hero: null, gallery: [] };
  }
}

export type SaveMediaResult =
  | { status: "saved" }
  | { status: "invalid"; message: string }
  | { status: "limit" }
  | { status: "disabled" }
  | { status: "unavailable" };

export async function saveBusinessMedia(input: {
  businessId: string;
  role: BusinessMediaRole;
  fileName: string;
  contentType: string;
  bytes: Buffer;
  altText: string;
}): Promise<SaveMediaResult> {
  if (!isMediaStorageConfigured()) return { status: "disabled" };

  const extension = allowedImageTypes[input.contentType];
  if (!extension) {
    return {
      status: "invalid",
      message: "Upload a JPEG, PNG or WebP image.",
    };
  }
  if (input.bytes.byteLength === 0) {
    return { status: "invalid", message: "The uploaded file was empty." };
  }
  if (input.bytes.byteLength > maxImageBytes) {
    return {
      status: "invalid",
      message: "Images must be 5MB or smaller.",
    };
  }

  const altText = input.altText.trim().slice(0, 300);
  const storageKey = `business/${input.businessId}/${input.role}/${randomUUID()}.${extension}`;

  try {
    const database = getDatabase();

    const [{ activeCount }] = (await database
      .select({ activeCount: sql<number>`count(*)::int` })
      .from(businessMedia)
      .where(
        and(
          eq(businessMedia.businessId, input.businessId),
          eq(businessMedia.role, input.role),
          eq(businessMedia.status, "active"),
        ),
      )) as [{ activeCount: number }];

    const replacesExisting = input.role !== "gallery";
    if (!replacesExisting && activeCount >= mediaLimits[input.role]) {
      return { status: "limit" };
    }

    // Upload to storage first so a failed upload never corrupts the draft
    // (docs/32 WP-04); only then swap the database records atomically.
    await putMediaObject(storageKey, input.bytes, input.contentType);

    const replaced = await database.transaction(async (transaction) => {
      let replacedKeys: string[] = [];
      if (replacesExisting) {
        const rows = await transaction
          .update(businessMedia)
          .set({ status: "replaced", updatedAt: sql`now()` })
          .where(
            and(
              eq(businessMedia.businessId, input.businessId),
              eq(businessMedia.role, input.role),
              eq(businessMedia.status, "active"),
            ),
          )
          .returning({ storageKey: businessMedia.storageKey });
        replacedKeys = rows.map((row) => row.storageKey);
      }

      await transaction.insert(businessMedia).values({
        businessId: input.businessId,
        role: input.role,
        storageKey,
        altText,
        contentType: input.contentType,
        byteSize: input.bytes.byteLength,
        sortOrder: input.role === "gallery" ? activeCount : 0,
      });

      return replacedKeys;
    });

    // Best-effort cleanup of replaced objects; records already point away.
    await Promise.allSettled(replaced.map((key) => deleteMediaObject(key)));

    return { status: "saved" };
  } catch {
    return { status: "unavailable" };
  }
}

export type RemoveMediaResult =
  { status: "removed" } | { status: "missing" } | { status: "unavailable" };

export async function removeBusinessMedia(input: {
  businessId: string;
  mediaId: string;
}): Promise<RemoveMediaResult> {
  try {
    const database = getDatabase();
    const [row] = await database
      .update(businessMedia)
      .set({ status: "removed", updatedAt: sql`now()` })
      .where(
        and(
          eq(businessMedia.id, input.mediaId),
          eq(businessMedia.businessId, input.businessId),
          eq(businessMedia.status, "active"),
        ),
      )
      .returning({ storageKey: businessMedia.storageKey });

    if (!row) return { status: "missing" };

    await Promise.allSettled([deleteMediaObject(row.storageKey)]);
    return { status: "removed" };
  } catch {
    return { status: "unavailable" };
  }
}
