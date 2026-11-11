"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  reportRateLimited,
  type ReportActionResult,
} from "@/app/report/report-throttle";
import {
  offerReportReasons,
  submitOfferReport,
} from "@/modules/moderation/content-reports";

const inputSchema = z.object({
  reason: z.enum(offerReportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
});

/** Bound to the item by the page: `submitOfferReportAction.bind(null, id)`. */
export async function submitOfferReportAction(
  offerId: string,
  input: unknown,
): Promise<ReportActionResult> {
  const parsedId = z.uuid().safeParse(offerId);
  const parsed = inputSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { status: "unavailable" };

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

  return submitOfferReport({
    offerId: parsedId.data,
    reason: parsed.data.reason,
    details: parsed.data.details,
    reporterEmail: parsed.data.reporterEmail,
    reporterUserId,
  });
}
