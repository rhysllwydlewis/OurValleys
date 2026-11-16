"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import {
  archiveGuideForAdmin,
  createGuideForAdmin,
  publishGuideForAdmin,
  revertGuideToDraftForAdmin,
  updateGuideForAdmin,
  type MutateGuideResult,
  type SetGuideStatusResult,
} from "@/modules/guides/admin";
import {
  deleteGuideWelshForAdmin,
  saveGuideWelshForAdmin,
  type DeleteGuideWelshResult,
  type SaveGuideWelshResult,
} from "@/modules/guides/welsh-admin";
import {
  removeGuidePicture,
  saveGuidePicture,
  updateGuidePictureText,
  type GuidePictureResult,
} from "@/modules/guides/guide-picture";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

/** Public guide lists and the homepage strip are cached; drop them on any change. */
function refreshPublicGuides() {
  updateTag("guides");
  updateTag("homepage");
}

export async function createGuideAction(
  input: unknown,
): Promise<MutateGuideResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await createGuideForAdmin(input);
  if (result.status === "created") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.created",
      targetType: "guide",
      targetId: result.id,
    });
  }
  return result;
}

export async function updateGuideAction(
  input: unknown,
): Promise<MutateGuideResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await updateGuideForAdmin(input);
  if (result.status === "updated") {
    const id = (input as { id?: string }).id;
    refreshPublicGuides();
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.updated",
      targetType: "guide",
      targetId: id,
    });
  }
  return result;
}

const idSchema = z.object({ id: z.uuid() });

export async function publishGuideAction(
  input: unknown,
): Promise<SetGuideStatusResult | "forbidden"> {
  const admin = await readAdminSession();
  if (!admin) return "forbidden";
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  const result = await publishGuideForAdmin(parsed.data.id);
  if (result === "updated") {
    refreshPublicGuides();
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.published",
      targetType: "guide",
      targetId: parsed.data.id,
    });
  }
  return result;
}

export async function archiveGuideAction(
  input: unknown,
): Promise<SetGuideStatusResult | "forbidden"> {
  const admin = await readAdminSession();
  if (!admin) return "forbidden";
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  const result = await archiveGuideForAdmin(parsed.data.id);
  if (result === "updated") {
    refreshPublicGuides();
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.archived",
      targetType: "guide",
      targetId: parsed.data.id,
    });
  }
  return result;
}

export async function revertGuideToDraftAction(
  input: unknown,
): Promise<SetGuideStatusResult | "forbidden"> {
  const admin = await readAdminSession();
  if (!admin) return "forbidden";
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  const result = await revertGuideToDraftForAdmin(parsed.data.id);
  if (result === "updated") {
    refreshPublicGuides();
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.reverted_to_draft",
      targetType: "guide",
      targetId: parsed.data.id,
    });
  }
  return result;
}

export async function saveGuideWelshAction(
  input: unknown,
): Promise<SaveGuideWelshResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await saveGuideWelshForAdmin(input);
  if (result.status === "saved") {
    refreshPublicGuides();
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.welsh_saved",
      targetType: "guide",
      targetId: (input as { guideId?: string }).guideId,
    });
  }
  return result;
}

export async function deleteGuideWelshAction(
  input: unknown,
): Promise<DeleteGuideWelshResult | "forbidden"> {
  const admin = await readAdminSession();
  if (!admin) return "forbidden";
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  const result = await deleteGuideWelshForAdmin(parsed.data.id);
  if (result === "deleted") {
    refreshPublicGuides();
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.welsh_removed",
      targetType: "guide",
      targetId: parsed.data.id,
    });
  }
  return result;
}

/**
 * Adds, replaces or re-describes a guide's picture (doc 118). A chosen file
 * replaces the picture; with no file, the typed descriptions and credit edit
 * the current one.
 */
export async function saveGuidePictureAction(
  formData: FormData,
): Promise<GuidePictureResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const guideId = formData.get("guideId");
  const file = formData.get("image");
  const text = {
    alt: formData.get("alt"),
    altCy: formData.get("altCy"),
    credit: formData.get("credit"),
  };
  const result =
    file instanceof File && file.size > 0
      ? await saveGuidePicture({
          guideId,
          contentType: file.type,
          bytes: Buffer.from(await file.arrayBuffer()),
          ...text,
        })
      : await updateGuidePictureText({ guideId, ...text });
  if (result.status === "saved") {
    refreshPublicGuides();
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.picture_saved",
      targetType: "guide",
      targetId: typeof guideId === "string" ? guideId : undefined,
    });
  }
  return result;
}

export async function removeGuidePictureAction(
  input: unknown,
): Promise<GuidePictureResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const guideId =
    typeof input === "object" && input !== null && "guideId" in input
      ? (input as { guideId: unknown }).guideId
      : null;
  const result = await removeGuidePicture(guideId);
  if (result.status === "saved") {
    refreshPublicGuides();
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.picture_removed",
      targetType: "guide",
      targetId: typeof guideId === "string" ? guideId : undefined,
    });
  }
  return result;
}
