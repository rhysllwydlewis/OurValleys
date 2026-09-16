"use server";

import { z } from "zod";
import { hideReview, restoreReview } from "@/modules/businesses/reviews";
import { readAdminSession } from "@/modules/identity/admin-access";
import { recordAdminAudit } from "@/modules/identity/audit-log";

const inputSchema = z.object({
  reviewId: z.uuid(),
  reason: z.string().trim().max(500).optional(),
});

export type ReviewModerationActionResult =
  | { status: "ok" }
  | { status: "forbidden" }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function hideReviewAction(
  input: unknown,
): Promise<ReviewModerationActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await hideReview({
    reviewId: parsed.data.reviewId,
    adminUserId: admin.userId,
    reason: parsed.data.reason,
  });
  if (result === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "review.hidden",
      targetType: "business_review",
      targetId: parsed.data.reviewId,
    });
    return { status: "ok" };
  }
  return result === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}

export async function restoreReviewAction(
  input: unknown,
): Promise<ReviewModerationActionResult> {
  const admin = await readAdminSession();
  if (!admin) return { status: "forbidden" };
  const parsed = z.object({ reviewId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const result = await restoreReview({
    reviewId: parsed.data.reviewId,
    adminUserId: admin.userId,
  });
  if (result === "updated") {
    await recordAdminAudit({
      actorUserId: admin.userId,
      action: "review.restored",
      targetType: "business_review",
      targetId: parsed.data.reviewId,
    });
    return { status: "ok" };
  }
  return result === "not_found"
    ? { status: "invalid" }
    : { status: "unavailable" };
}
