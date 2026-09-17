"use server";

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
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

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
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "guide.reverted_to_draft",
      targetType: "guide",
      targetId: parsed.data.id,
    });
  }
  return result;
}
