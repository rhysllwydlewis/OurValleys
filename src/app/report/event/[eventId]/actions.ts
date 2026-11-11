"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  reportRateLimited,
  type ReportActionResult,
} from "@/app/report/report-throttle";
import {
  eventReportReasons,
  submitEventReport,
} from "@/modules/moderation/content-reports";

const inputSchema = z.object({
  eventId: z.uuid(),
  reason: z.enum(eventReportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
});

export async function submitEventReportAction(
  input: unknown,
): Promise<ReportActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "unavailable" };

  const requestHeaders = await headers();
  let reporterUserId: string | undefined;
  try {
    const session = await getAuth().api.getSession({
      headers: requestHeaders,
    });
    reporterUserId = session?.user.id;
  } catch {
    reporterUserId = undefined;
  }
  if (reportRateLimited(requestHeaders, reporterUserId)) {
    return { status: "rate_limited" };
  }

  return submitEventReport({
    eventId: parsed.data.eventId,
    reason: parsed.data.reason,
    details: parsed.data.details,
    reporterEmail: parsed.data.reporterEmail,
    reporterUserId,
  });
}
