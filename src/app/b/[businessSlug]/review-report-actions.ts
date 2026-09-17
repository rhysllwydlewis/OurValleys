"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  reviewReportReasons,
  submitReviewReport,
  type SubmitReportResult,
} from "@/modules/moderation/content-reports";

const inputSchema = z.object({
  reviewId: z.uuid(),
  reason: z.enum(reviewReportReasons),
  details: z.string().trim().max(1000).optional(),
});

export async function submitReviewReportAction(
  input: unknown,
): Promise<SubmitReportResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "unavailable" };

  let reporterUserId: string | undefined;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    reporterUserId = session?.user.id;
  } catch {
    reporterUserId = undefined;
  }

  return submitReviewReport({
    reviewId: parsed.data.reviewId,
    reason: parsed.data.reason,
    details: parsed.data.details,
    reporterUserId,
  });
}
