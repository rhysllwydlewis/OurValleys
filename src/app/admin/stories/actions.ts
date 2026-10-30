"use server";

import { z } from "zod";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import {
  archiveStoryForAdmin,
  createStoryForAdmin,
  deleteStoryForAdmin,
  publishStoryForAdmin,
  revertStoryToDraftForAdmin,
  updateStoryForAdmin,
  type MutateStoryResult,
  type SetStoryStatusResult,
} from "@/modules/stories/admin";

export async function createStoryAction(
  input: unknown,
): Promise<MutateStoryResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await createStoryForAdmin(input, admin.userId);
  if (result.status === "created") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "story.created",
      targetType: "local_story",
      targetId: result.id,
    });
  }
  return result;
}

export async function updateStoryAction(
  input: unknown,
): Promise<MutateStoryResult | { status: "forbidden" }> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };

  const result = await updateStoryForAdmin(input);
  if (result.status === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "story.updated",
      targetType: "local_story",
      targetId: (input as { id?: string }).id,
    });
  }
  return result;
}

const idSchema = z.object({ id: z.uuid() });

async function runStatusAction(
  input: unknown,
  perform: (id: string) => Promise<SetStoryStatusResult>,
  action: "story.published" | "story.archived" | "story.reverted_to_draft",
): Promise<SetStoryStatusResult | "forbidden"> {
  const admin = await readAdminSession();
  if (!admin) return "forbidden";
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  const result = await perform(parsed.data.id);
  if (result === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action,
      targetType: "local_story",
      targetId: parsed.data.id,
    });
  }
  return result;
}

export async function publishStoryAction(input: unknown) {
  return runStatusAction(input, publishStoryForAdmin, "story.published");
}

export async function archiveStoryAction(input: unknown) {
  return runStatusAction(input, archiveStoryForAdmin, "story.archived");
}

export async function revertStoryToDraftAction(input: unknown) {
  return runStatusAction(
    input,
    revertStoryToDraftForAdmin,
    "story.reverted_to_draft",
  );
}

export async function deleteStoryAction(
  input: unknown,
): Promise<"deleted" | "not_found" | "invalid" | "unavailable" | "forbidden"> {
  const admin = await readAdminSession();
  if (!admin) return "forbidden";
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  const result = await deleteStoryForAdmin(parsed.data.id);
  if (result === "deleted") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "story.deleted",
      targetType: "local_story",
      targetId: parsed.data.id,
    });
  }
  return result;
}
