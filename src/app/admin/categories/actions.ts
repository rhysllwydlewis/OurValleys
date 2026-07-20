"use server";

import {
  createCategoryForAdmin,
  updateCategoryForAdmin,
  type MutateCategoryResult,
} from "@/modules/reference-data/admin-categories";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

export async function createCategoryAction(
  input: unknown,
): Promise<MutateCategoryResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await createCategoryForAdmin(input);
  if (result.status === "created") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "category.created",
      targetType: "category",
      targetId: result.id,
    });
  }
  return result;
}

export async function updateCategoryAction(
  input: unknown,
): Promise<MutateCategoryResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await updateCategoryForAdmin(input);
  if (result.status === "updated") {
    const id = (input as { id?: string }).id;
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "category.updated",
      targetType: "category",
      targetId: id,
    });
  }
  return result;
}
