"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { canUseBusinessAppearanceTools } from "@/lib/public-demo-policy";
import {
  isMediaRole,
  moveBusinessGalleryMedia,
  promoteGalleryMediaToCover,
  removeBusinessMedia,
  saveBusinessMedia,
  setBusinessGalleryOrder,
  updateBusinessMediaPresentation,
} from "@/modules/businesses/media";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { recordAdminAudit } from "@/modules/identity/audit-log";

async function readAuthorisedEditor(
  businessId: string,
): Promise<string | null> {
  if (!z.uuid().safeParse(businessId).success) return null;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session) return null;
    if (!canUseBusinessAppearanceTools(session.user.email)) return null;
    const authorised = await canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.editProfile,
    });
    return authorised ? session.user.id : null;
  } catch {
    return null;
  }
}

/**
 * Back to the studio with an outcome; `photo` keeps the page anchored on the
 * photo that was just changed so a long gallery does not jump to the top.
 */
function backTo(businessId: string, outcome: string, photoId?: string): never {
  if (!z.uuid().safeParse(businessId).success) redirect("/account");
  const query = new URLSearchParams({ outcome });
  const anchor =
    photoId && z.uuid().safeParse(photoId).success ? `#photo-${photoId}` : "";
  redirect(`/dashboard/business/${businessId}/photos?${query}${anchor}`);
}

function readFocalPoint(formData: FormData, name: string): number {
  const raw = formData.get(name);
  // A missing or blank field must not silently become 0 (`Number("")`).
  if (typeof raw !== "string" || raw.trim() === "") return Number.NaN;
  return Number(raw);
}

export async function uploadPhotoAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await readAuthorisedEditor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");

  const role = String(formData.get("role") ?? "");
  const file = formData.get("file");
  if (!isMediaRole(role) || !(file instanceof File) || file.size === 0) {
    backTo(businessId, "invalid");
  }

  const result = await saveBusinessMedia({
    businessId,
    role,
    contentType: file.type,
    bytes: Buffer.from(await file.arrayBuffer()),
    altText: String(formData.get("altText") ?? ""),
    focalX: readFocalPoint(formData, "focalX"),
    focalY: readFocalPoint(formData, "focalY"),
  });

  if (result.status === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.media_uploaded",
      targetType: "business",
      targetId: businessId,
      metadata: { role, byteSize: file.size, via: "photos_studio" },
    });
  }
  backTo(businessId, result.status === "saved" ? "uploaded" : result.status);
}

export async function savePhotoAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await readAuthorisedEditor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");

  const mediaId = String(formData.get("mediaId") ?? "");
  if (!z.uuid().safeParse(mediaId).success) backTo(businessId, "invalid");

  const result = await updateBusinessMediaPresentation({
    businessId,
    mediaId,
    altText: String(formData.get("altText") ?? ""),
    focalX: readFocalPoint(formData, "focalX"),
    focalY: readFocalPoint(formData, "focalY"),
  });
  if (result.status === "saved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.media_updated",
      targetType: "business_media",
      targetId: mediaId,
      metadata: { businessId, via: "photos_studio" },
    });
  }
  backTo(
    businessId,
    result.status === "saved" ? "photo-saved" : result.status,
    mediaId,
  );
}

export async function makeCoverPhotoAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await readAuthorisedEditor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");

  const mediaId = String(formData.get("mediaId") ?? "");
  if (!z.uuid().safeParse(mediaId).success) backTo(businessId, "invalid");

  const result = await promoteGalleryMediaToCover({ businessId, mediaId });
  if (result.status === "promoted") {
    await recordAdminAudit({
      actorUserId,
      action: "business.media_promoted",
      targetType: "business_media",
      targetId: mediaId,
      metadata: { businessId },
    });
  }
  backTo(
    businessId,
    result.status === "promoted" ? "cover-set" : result.status,
    mediaId,
  );
}

export async function movePhotoAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await readAuthorisedEditor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");

  const mediaId = String(formData.get("mediaId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (
    !z.uuid().safeParse(mediaId).success ||
    (direction !== "up" && direction !== "down")
  ) {
    backTo(businessId, "invalid");
  }

  const result = await moveBusinessGalleryMedia({
    businessId,
    mediaId,
    direction,
  });
  if (result.status === "moved") {
    await recordAdminAudit({
      actorUserId,
      action: "business.media_reordered",
      targetType: "business_media",
      targetId: mediaId,
      metadata: { businessId, direction, via: "photos_studio" },
    });
  }
  backTo(businessId, result.status, mediaId);
}

export async function reorderPhotosAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await readAuthorisedEditor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");

  const orderedIds = String(formData.get("order") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (
    orderedIds.length === 0 ||
    orderedIds.length > 50 ||
    !orderedIds.every((id) => z.uuid().safeParse(id).success)
  ) {
    backTo(businessId, "invalid");
  }

  const result = await setBusinessGalleryOrder({ businessId, orderedIds });
  if (result.status === "reordered") {
    await recordAdminAudit({
      actorUserId,
      action: "business.media_reordered",
      targetType: "business",
      targetId: businessId,
      metadata: {
        businessId,
        method: "drag_and_drop",
        count: orderedIds.length,
        via: "photos_studio",
      },
    });
  }
  backTo(businessId, result.status === "reordered" ? "moved" : result.status);
}

export async function removePhotoAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get("businessId") ?? "");
  const actorUserId = await readAuthorisedEditor(businessId);
  if (!actorUserId) backTo(businessId, "forbidden");

  const mediaId = String(formData.get("mediaId") ?? "");
  if (!z.uuid().safeParse(mediaId).success) backTo(businessId, "invalid");

  const result = await removeBusinessMedia({ businessId, mediaId });
  if (result.status === "removed") {
    await recordAdminAudit({
      actorUserId,
      action: "business.media_removed",
      targetType: "business_media",
      targetId: mediaId,
      metadata: { businessId, via: "photos_studio" },
    });
  }
  backTo(businessId, result.status);
}
