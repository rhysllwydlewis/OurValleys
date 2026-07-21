"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { createBusinessTicket } from "@/modules/businesses/tickets";
import {
  reportReasons,
  submitContentReport,
  type SubmitReportResult,
} from "@/modules/moderation/content-reports";

const inputSchema = z.object({
  businessId: z.uuid(),
  reason: z.enum(reportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
  suggestedPhone: z.string().trim().max(30).optional(),
  suggestedEmail: z.union([z.email().max(254), z.literal("")]).optional(),
  suggestedSummary: z.string().trim().max(240).optional(),
  suggestedDescription: z.string().trim().max(5000).optional(),
});

export async function submitBusinessReport(
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

  const report = await submitContentReport({
    businessId: parsed.data.businessId,
    reason: parsed.data.reason,
    details: parsed.data.details,
    reporterEmail: parsed.data.reporterEmail,
    reporterUserId,
  });
  if (report.status === "submitted") {
    const changes = Object.fromEntries(
      Object.entries({
        publicPhone: parsed.data.suggestedPhone,
        publicEmail: parsed.data.suggestedEmail,
        summary: parsed.data.suggestedSummary,
        description: parsed.data.suggestedDescription,
      }).filter(([, value]) => typeof value === "string" && value.length > 0),
    );

    await createBusinessTicket({
      businessId: parsed.data.businessId,
      reporterUserId,
      reporterEmail: parsed.data.reporterEmail,
      type:
        parsed.data.reason === "duplicate_listing" ? "duplicate" : "correction",
      reason:
        parsed.data.details ||
        `Public correction submitted for ${parsed.data.reason.replaceAll("_", " ")}.`,
      evidence: {
        reportReason: parsed.data.reason,
        ...(Object.keys(changes).length > 0 ? { changes } : {}),
      },
      riskLevel:
        parsed.data.reason === "inappropriate_content" ||
        parsed.data.reason === "duplicate_listing"
          ? "high"
          : "standard",
    });
  }
  return report;
}
