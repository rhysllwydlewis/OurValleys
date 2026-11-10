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
