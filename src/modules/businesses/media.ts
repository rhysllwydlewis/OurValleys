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
import {
  inspectImageUpload,
  moveIdInOrder,
  normaliseFocalPoint,
} from "./media-validation";

/** Free-tier media allowance (docs/32 §23 recommended defaults). */
export const mediaLimits = { logo: 1, hero: 1, gallery: 12 } as const;

export type BusinessMediaRole = keyof typeof mediaLimits;

export type BusinessMediaItem = {
  id: string;
  role: BusinessMediaRole;
  url: string;
  altText: string;
  focalX: number;
  focalY: number;
  sortOrder: number;
};

export type BusinessMediaCollection = {
  logo: BusinessMediaItem | null;
  hero: BusinessMediaItem | null;
  gallery: BusinessMediaItem[];
};

export function isMediaRole(value: string): value is BusinessMediaRole {
  return value in mediaLimits;
}

export async function listBusinessMedia(
  businessId: string,
): Promise<BusinessMediaCollection> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: businessMedia.id,
        role: businessMedia.role,
        storageKey: businessMedia.storageKey,
        altText: businessMedia.altText,
        focalX: businessMedia.focalX,
        focalY: businessMedia.focalY,
        sortOrder: businessMedia.sortOrder,
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
      return [
        {
          id: row.id,
          role: row.role,
          url,
          altText: row.altText,
          focalX: row.focalX,
          focalY: row.focalY,
          sortOrder: row.sortOrder,
        },
      ];
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
  contentType: string;
  bytes: Buffer;
  altText: string;
  focalX: number;
  focalY: number;
}): Promise<SaveMediaResult> {
  if (!isMediaStorageConfigured()) return { status: "disabled" };

  const inspected = inspectImageUpload(input.bytes, input.contentType);
  if (inspected.status === "invalid") return inspected;

  const focalX = normaliseFocalPoint(input.focalX);
  const focalY = normaliseFocalPoint(input.focalY);
  if (focalX === null || focalY === null) {
    return { status: "invalid", message: "Choose a valid focal point." };
  }

  const altText = input.altText.trim().slice(0, 300);
  if (input.role !== "logo" && altText.length < 3) {
    return {
      status: "invalid",
      message: "Describe hero and gallery images for screen-reader users.",
    };
  }

  const storageKey = `business/${input.businessId}/${input.role}/${randomUUID()}.${inspected.image.extension}`;
  let uploaded = false;

  try {
    await putMediaObject(
      storageKey,
      input.bytes,
      inspected.image.contentType,
    );
    uploaded = true;

    const database = getDatabase();
    const result = await database.transaction(async (transaction) => {
      const lockKey = `${input.businessId}:${input.role}`;
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`,
      );

      const [stats] = await transaction
        .select({
          activeCount: sql<number>`count(*)::int`,
          highestOrder: sql<number>`coalesce(max(${businessMedia.sortOrder}), -1)::int`,
        })
        .from(businessMedia)
        .where(
          and(
            eq(businessMedia.businessId, input.businessId),
            eq(businessMedia.role, input.role),
            eq(businessMedia.status, "active"),
          ),
        );

      if (
        input.role === "gallery" &&
        (stats?.activeCount ?? 0) >= mediaLimits.gallery
      ) {
        return { status: "limit" as const, replacedKeys: [] as string[] };
      }

      let replacedKeys: string[] = [];
      if (input.role !== "gallery") {
        const replaced = await transaction
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
        replacedKeys = replaced.map((row) => row.storageKey);
      }

      await transaction.insert(businessMedia).values({
        businessId: input.businessId,
        role: input.role,
        storageKey,
        altText,
        contentType: inspected.image.contentType,
        byteSize: input.bytes.byteLength,
        focalX,
        focalY,
        sortOrder:
          input.role === "gallery" ? (stats?.highestOrder ?? -1) + 1 : 0,
      });

      return { status: "saved" as const, replacedKeys };
    });

    if (result.status === "limit") {
      await Promise.allSettled([deleteMediaObject(storageKey)]);
      return { status: "limit" };
    }

    await Promise.allSettled(
      result.replacedKeys.map((key) => deleteMediaObject(key)),
    );
    return { status: "saved" };
  } catch {
    if (uploaded) await Promise.allSettled([deleteMediaObject(storageKey)]);
    return { status: "unavailable" };
  }
}

export type UpdateMediaResult =
  | { status: "saved" }
  | { status: "invalid"; message: string }
  | { status: "missing" }
  | { status: "unavailable" };

export async function updateBusinessMediaPresentation(input: {
  businessId: string;
  mediaId: string;
  altText: string;
  focalX: number;
  focalY: number;
}): Promise<UpdateMediaResult> {
  const focalX = normaliseFocalPoint(input.focalX);
  const focalY = normaliseFocalPoint(input.focalY);
  if (focalX === null || focalY === null) {
    return { status: "invalid", message: "Choose a valid focal point." };
  }

  try {
    const database = getDatabase();
    const [existing] = await database
      .select({ role: businessMedia.role })
      .from(businessMedia)
      .where(
        and(
          eq(businessMedia.id, input.mediaId),
          eq(businessMedia.businessId, input.businessId),
          eq(businessMedia.status, "active"),
        ),
      )
      .limit(1);

    if (!existing || !isMediaRole(existing.role)) return { status: "missing" };

    const altText = input.altText.trim().slice(0, 300);
    if (existing.role !== "logo" && altText.length < 3) {
      return {
        status: "invalid",
        message: "Describe hero and gallery images for screen-reader users.",
      };
    }

    const [updated] = await database
      .update(businessMedia)
      .set({ altText, focalX, focalY, updatedAt: sql`now()` })
      .where(
        and(
          eq(businessMedia.id, input.mediaId),
          eq(businessMedia.businessId, input.businessId),
          eq(businessMedia.status, "active"),
        ),
      )
      .returning({ id: businessMedia.id });

    return updated ? { status: "saved" } : { status: "missing" };
  } catch {
    return { status: "unavailable" };
  }
}

export type MoveMediaResult =
  | { status: "moved" }
  | { status: "unchanged" }
  | { status: "missing" }
  | { status: "unavailable" };

export async function moveBusinessGalleryMedia(input: {
  businessId: string;
  mediaId: string;
  direction: "up" | "down";
}): Promise<MoveMediaResult> {
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:gallery`}))`,
      );

      const rows = await transaction
        .select({ id: businessMedia.id })
        .from(businessMedia)
        .where(
          and(
            eq(businessMedia.businessId, input.businessId),
            eq(businessMedia.role, "gallery"),
            eq(businessMedia.status, "active"),
          ),
        )
        .orderBy(asc(businessMedia.sortOrder), asc(businessMedia.createdAt));

      const ids = rows.map((row) => row.id);
      if (!ids.includes(input.mediaId)) return { status: "missing" as const };
      const reordered = moveIdInOrder(ids, input.mediaId, input.direction);
      if (reordered.every((id, index) => id === ids[index])) {
        return { status: "unchanged" as const };
      }

      for (const [sortOrder, id] of reordered.entries()) {
        await transaction
          .update(businessMedia)
          .set({ sortOrder, updatedAt: sql`now()` })
          .where(
            and(
              eq(businessMedia.id, id),
              eq(businessMedia.businessId, input.businessId),
              eq(businessMedia.status, "active"),
            ),
          );
      }

      return { status: "moved" as const };
    });
  } catch {
    return { status: "unavailable" };
  }
}

export type RemoveMediaResult =
  | { status: "removed" }
  | { status: "missing" }
  | { status: "unavailable" };

export async function removeBusinessMedia(input: {
  businessId: string;
  mediaId: string;
}): Promise<RemoveMediaResult> {
  try {
    const database = getDatabase();
    const row = await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:media`}))`,
      );

      const [removed] = await transaction
        .update(businessMedia)
        .set({ status: "removed", updatedAt: sql`now()` })
        .where(
          and(
            eq(businessMedia.id, input.mediaId),
            eq(businessMedia.businessId, input.businessId),
            eq(businessMedia.status, "active"),
          ),
        )
        .returning({
          storageKey: businessMedia.storageKey,
          role: businessMedia.role,
        });

      if (!removed) return null;

      if (removed.role === "gallery") {
        const remaining = await transaction
          .select({ id: businessMedia.id })
          .from(businessMedia)
          .where(
            and(
              eq(businessMedia.businessId, input.businessId),
              eq(businessMedia.role, "gallery"),
              eq(businessMedia.status, "active"),
            ),
          )
          .orderBy(asc(businessMedia.sortOrder), asc(businessMedia.createdAt));

        for (const [sortOrder, item] of remaining.entries()) {
          await transaction
            .update(businessMedia)
            .set({ sortOrder, updatedAt: sql`now()` })
            .where(eq(businessMedia.id, item.id));
        }
      }

      return removed;
    });

    if (!row) return { status: "missing" };
    await Promise.allSettled([deleteMediaObject(row.storageKey)]);
    return { status: "removed" };
  } catch {
    return { status: "unavailable" };
  }
}
