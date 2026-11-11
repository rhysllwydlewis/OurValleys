"use server";

import { updateTag } from "next/cache";
import {
  createPlaceForAdmin,
  updatePlaceForAdmin,
  type MutatePlaceResult,
} from "@/modules/reference-data/admin-places";
import {
  savePlaceProfileForAdmin,
  type SavePlaceProfileResult,
} from "@/modules/reference-data/place-profile";
import {
  removePlacePicture,
  savePlacePicture,
  updatePlacePictureText,
  type PlacePictureResult,
} from "@/modules/reference-data/place-picture";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

export async function createPlaceAction(
  input: unknown,
): Promise<MutatePlaceResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await createPlaceForAdmin(input);
  if (result.status === "created") {
    updateTag("business-directory");
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "place.created",
      targetType: "place",
      targetId: result.id,
    });
  }
  return result;
}

export async function updatePlaceAction(
  input: unknown,
): Promise<MutatePlaceResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await updatePlaceForAdmin(input);
  if (result.status === "updated") {
    updateTag("business-directory");
    const id = (input as { id?: string }).id;
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "place.updated",
      targetType: "place",
      targetId: id,
    });
  }
  return result;
}

export async function savePlaceProfileAction(
  input: unknown,
): Promise<SavePlaceProfileResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await savePlaceProfileForAdmin(input, admin.userId);
  if (result.status === "saved") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "place.profile_updated",
      targetType: "place",
      targetId: (input as { placeId?: string }).placeId,
    });
  }
  return result;
}

/**
 * Adds, replaces or re-describes a place's picture. A chosen file replaces the
 * picture; with no file, the typed descriptions and credit edit the current one.
 */
export async function savePlacePictureAction(
  formData: FormData,
): Promise<PlacePictureResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const placeId = formData.get("placeId");
  const file = formData.get("image");
  const text = {
    alt: formData.get("alt"),
    altCy: formData.get("altCy"),
    credit: formData.get("credit"),
    actorUserId: admin.userId,
  };
  const result =
    file instanceof File && file.size > 0
      ? await savePlacePicture({
          placeId,
          contentType: file.type,
          bytes: Buffer.from(await file.arrayBuffer()),
          ...text,
        })
      : await updatePlacePictureText({ placeId, ...text });
  if (result.status === "saved") {
    updateTag("business-directory");
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "place.picture_saved",
      targetType: "place",
      targetId: typeof placeId === "string" ? placeId : undefined,
    });
  }
  return result;
}

export async function removePlacePictureAction(
  input: unknown,
): Promise<PlacePictureResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const placeId =
    typeof input === "object" && input !== null && "placeId" in input
      ? (input as { placeId: unknown }).placeId
      : null;
  const result = await removePlacePicture(placeId, admin.userId);
  if (result.status === "saved") {
    updateTag("business-directory");
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "place.picture_removed",
      targetType: "place",
      targetId: typeof placeId === "string" ? placeId : undefined,
    });
  }
  return result;
}
