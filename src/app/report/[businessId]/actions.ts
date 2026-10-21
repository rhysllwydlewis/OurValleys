"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  parseSuggestionNotes,
  routesToOwner,
  suggestionLimits,
} from "@/modules/businesses/corrections-model";
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
  suggestedHours: z.string().trim().max(suggestionLimits.hours).optional(),
  suggestedAddress: z.string().trim().max(suggestionLimits.address).optional(),
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

  const reason = parsed.data.reason;
  // Suggested details and notes only count for the reasons whose form shows
  // them, so a field left over from a different reason is never sent on.
  const changes =
    reason === "incorrect_details"
      ? Object.fromEntries(
          Object.entries({
            publicPhone: parsed.data.suggestedPhone,
            publicEmail: parsed.data.suggestedEmail,
            summary: parsed.data.suggestedSummary,
            description: parsed.data.suggestedDescription,
          }).filter(
            ([, value]) => typeof value === "string" && value.length > 0,
          ),
        )
      : {};
  const notes =
    reason === "incorrect_details" || reason === "closed_or_moved"
      ? parseSuggestionNotes({
          hours: parsed.data.suggestedHours,
          address: parsed.data.suggestedAddress,
        })
      : {};

  // An ordinary correction goes to the business as a ticket only: a second
  // moderation report for the same words would stay open on the admin desk
  // after the owner decided. Anything else is reported and ticketed as before.
  if (!routesToOwner(reason)) {
    const report = await submitContentReport({
      businessId: parsed.data.businessId,
      reason,
      details: parsed.data.details,
      reporterEmail: parsed.data.reporterEmail,
      reporterUserId,
    });
    if (report.status !== "submitted") return report;
  }

  // The ticket needs a reason of at least 10 characters; a shorter note is
  // kept after a standard sentence rather than rejected.
  const label = `Public correction submitted for ${reason.replaceAll("_", " ")}`;
  const details = parsed.data.details ?? "";
  const ticket = await createBusinessTicket({
    businessId: parsed.data.businessId,
    reporterUserId,
    reporterEmail: parsed.data.reporterEmail,
    type: reason === "duplicate_listing" ? "duplicate" : "correction",
    reason:
      details.length >= 10
        ? details
        : details
          ? `${label}: ${details}`
          : `${label}.`,
    evidence: {
      reportReason: reason,
      ...(Object.keys(changes).length > 0 ? { changes } : {}),
      ...(Object.keys(notes).length > 0 ? { notes } : {}),
    },
    riskLevel:
      reason === "inappropriate_content" || reason === "duplicate_listing"
        ? "high"
        : "standard",
  });
  if (ticket.status === "created") return { status: "submitted" };
  return ticket.status === "not_found"
    ? { status: "not_found" }
    : { status: "unavailable" };
}
