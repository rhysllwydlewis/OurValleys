"use server";

import {
  createFeatureFlagForAdmin,
  updateFeatureFlagForAdmin,
  type MutateFeatureFlagResult,
} from "@/modules/platform/feature-flags";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

export async function createFeatureFlagAction(
  input: unknown,
): Promise<MutateFeatureFlagResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await createFeatureFlagForAdmin(input, admin.userId);
  if (result.status === "created") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "feature_flag.created",
      targetType: "feature_flag",
      targetId: result.id,
    });
  }
  return result;
}

export async function updateFeatureFlagAction(
  input: unknown,
): Promise<MutateFeatureFlagResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await updateFeatureFlagForAdmin(input, admin.userId);
  if (result.status === "updated") {
    const id = (input as { id?: string }).id;
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "feature_flag.updated",
      targetType: "feature_flag",
      targetId: id,
    });
  }
  return result;
}
