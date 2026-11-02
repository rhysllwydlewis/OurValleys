"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  updateReportReasons,
  submitUpdateReport,
  type SubmitReportResult,
} from "@/modules/moderation/content-reports";

const inputSchema = z.object({
  reason: z.enum(updateReportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
});

/** Bound to the item by the page: `submitUpdateReportAction.bind(null, id)`. */
export async function submitUpdateReportAction(
  updateId: string,
  input: unknown,
): Promise<SubmitReportResult> {
  const parsedId = z.uuid().safeParse(updateId);
  const parsed = inputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { status: "unavailable" };

  let reporterUserId: string | undefined;
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    reporterUserId = session?.user.id;
  } catch {
    reporterUserId = undefined;
  }

  return submitUpdateReport({
    updateId: parsedId.data,
    reason: parsed.data.reason,
    details: parsed.data.details,
    reporterEmail: parsed.data.reporterEmail,
    reporterUserId,
  });
}
