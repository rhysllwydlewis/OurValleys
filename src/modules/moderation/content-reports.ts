import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { contentReport } from "@/lib/database/schema/moderation";

export const reportReasons = [
  "incorrect_details",
  "closed_or_moved",
  "inappropriate_content",
  "duplicate_listing",
  "other",
] as const;
export type ReportReason = (typeof reportReasons)[number];

export const submitReportInputSchema = z.object({
  businessId: z.uuid(),
  reason: z.enum(reportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
  reporterUserId: z.uuid().optional(),
});

export type SubmitReportResult =
  { status: "submitted" } | { status: "not_found" } | { status: "unavailable" };

/**
 * Public-facing: anyone can report a business, signed in or not. Only
 * accepts reports against businesses that actually exist, to avoid the
 * queue filling with reports against arbitrary ids.
 */
export async function submitContentReport(
  rawInput: z.infer<typeof submitReportInputSchema>,
): Promise<SubmitReportResult> {
  const parsed = submitReportInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "unavailable" };
  const input = parsed.data;

  try {
    const database = getDatabase();
    const [businessRow] = await database
      .select({ id: business.id })
      .from(business)
      .where(eq(business.id, input.businessId))
      .limit(1);
    if (!businessRow) return { status: "not_found" };

    await database.insert(contentReport).values({
      businessId: input.businessId,
      reporterUserId: input.reporterUserId ?? null,
      reporterEmail: input.reporterEmail ? input.reporterEmail : null,
      reason: input.reason,
      details: input.details ? input.details : null,
    });

    return { status: "submitted" };
  } catch {
    return { status: "unavailable" };
  }
}

export type ContentReportSummary = {
  id: string;
  businessId: string;
  businessTradingName: string;
  reason: string;
  details: string | null;
  status: string;
  reporterEmail: string | null;
  createdAt: Date;
};

export type ContentReportListResult =
  | { state: "ready"; reports: ContentReportSummary[] }
  | { state: "unavailable"; reports: [] };

export async function listContentReports(
  statusFilter?: "open" | "resolved" | "dismissed",
): Promise<ContentReportListResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: contentReport.id,
        businessId: contentReport.businessId,
        businessTradingName: business.tradingName,
        reason: contentReport.reason,
        details: contentReport.details,
        status: contentReport.status,
        reporterEmail: contentReport.reporterEmail,
        createdAt: contentReport.createdAt,
      })
      .from(contentReport)
      .innerJoin(business, eq(business.id, contentReport.businessId))
      .where(statusFilter ? eq(contentReport.status, statusFilter) : undefined)
      .orderBy(desc(contentReport.createdAt))
      .limit(200);

    return { state: "ready", reports: rows };
  } catch {
    return { state: "unavailable", reports: [] };
  }
}

export async function countOpenContentReports(): Promise<number> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({ value: count() })
      .from(contentReport)
      .where(eq(contentReport.status, "open"));
    return row?.value ?? 0;
  } catch {
    return 0;
  }
}

export type ResolveReportResult =
  { status: "updated" } | { status: "not_found" } | { status: "unavailable" };

async function updateReportStatus(input: {
  reportId: string;
  adminUserId: string;
  status: "resolved" | "dismissed";
  note?: string;
}): Promise<ResolveReportResult> {
  try {
    const database = getDatabase();
    const [updated] = await database
      .update(contentReport)
      .set({
        status: input.status,
        resolvedByUserId: input.adminUserId,
        resolutionNote: input.note ?? null,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentReport.id, input.reportId),
          eq(contentReport.status, "open"),
        ),
      )
      .returning({ id: contentReport.id });

    return updated ? { status: "updated" } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}

export function resolveContentReport(input: {
  reportId: string;
  adminUserId: string;
  note?: string;
}): Promise<ResolveReportResult> {
  return updateReportStatus({ ...input, status: "resolved" });
}

export function dismissContentReport(input: {
  reportId: string;
  adminUserId: string;
  note?: string;
}): Promise<ResolveReportResult> {
  return updateReportStatus({ ...input, status: "dismissed" });
}
