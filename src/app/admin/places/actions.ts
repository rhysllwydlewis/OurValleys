"use server";

import {
  createPlaceForAdmin,
  updatePlaceForAdmin,
  type MutatePlaceResult,
} from "@/modules/reference-data/admin-places";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

export async function createPlaceAction(
  input: unknown,
): Promise<MutatePlaceResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await createPlaceForAdmin(input);
  if (result.status === "created") {
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
