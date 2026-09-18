import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { businessReview } from "@/lib/database/schema/business-reviews";
import { contentReport } from "@/lib/database/schema/moderation";

export const reportReasons = [
  "incorrect_details",
  "closed_or_moved",
  "inappropriate_content",
  "duplicate_listing",
  "other",
] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reviewReportReasons = [
  "abusive_or_offensive",
  "spam_or_advertising",
  "fake_or_not_a_customer",
  "off_topic",
  "other",
] as const;
export type ReviewReportReason = (typeof reviewReportReasons)[number];

export const eventReportReasons = [
  "incorrect_details",
  "cancelled_or_wrong_date",
  "inappropriate_content",
  "duplicate_listing",
  "other",
] as const;
export type EventReportReason = (typeof eventReportReasons)[number];

export const submitReportInputSchema = z.object({
  businessId: z.uuid(),
  reason: z.enum(reportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
  reporterUserId: z.uuid().optional(),
});

export const submitReviewReportInputSchema = z.object({
  reviewId: z.uuid(),
  reason: z.enum(reviewReportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
  reporterUserId: z.uuid().optional(),
});

export const submitEventReportInputSchema = z.object({
  eventId: z.uuid(),
  reason: z.enum(eventReportReasons),
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

/**
 * Public-facing: anyone can report a review, signed in or not. Only
 * accepts reports against reviews that actually exist and are currently
 * published, mirroring submitContentReport's guard against arbitrary ids.
 */
export async function submitReviewReport(
  rawInput: z.infer<typeof submitReviewReportInputSchema>,
): Promise<SubmitReportResult> {
  const parsed = submitReviewReportInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "unavailable" };
  const input = parsed.data;

  try {
    const database = getDatabase();
    const [reviewRow] = await database
      .select({ id: businessReview.id })
      .from(businessReview)
      .where(
        and(
          eq(businessReview.id, input.reviewId),
          eq(businessReview.status, "published"),
        ),
      )
      .limit(1);
    if (!reviewRow) return { status: "not_found" };

    await database.insert(contentReport).values({
      reviewId: input.reviewId,
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

/**
 * Public-facing: anyone can report an event, signed in or not. Only accepts
 * reports against events that actually exist and are currently active,
 * mirroring submitReviewReport's guard against arbitrary or already-hidden
 * ids.
 */
export async function submitEventReport(
  rawInput: z.infer<typeof submitEventReportInputSchema>,
): Promise<SubmitReportResult> {
  const parsed = submitEventReportInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "unavailable" };
  const input = parsed.data;

  try {
    const database = getDatabase();
    const [eventRow] = await database
      .select({ id: businessEvent.id })
      .from(businessEvent)
      .where(
        and(
          eq(businessEvent.id, input.eventId),
          eq(businessEvent.status, "active"),
        ),
      )
      .limit(1);
    if (!eventRow) return { status: "not_found" };

    await database.insert(contentReport).values({
      eventId: input.eventId,
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
  targetType: "business" | "review" | "event";
  businessId: string;
  businessTradingName: string;
  reviewId: string | null;
  reviewBody: string | null;
  reviewRating: number | null;
  eventId: string | null;
  eventTitle: string | null;
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

    const businessReports = await database
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
      .where(
        statusFilter
          ? and(
              isNull(contentReport.reviewId),
              eq(contentReport.status, statusFilter),
            )
          : isNull(contentReport.reviewId),
      )
      .orderBy(desc(contentReport.createdAt))
      .limit(200);

    const reviewReports = await database
      .select({
        id: contentReport.id,
        businessId: businessReview.businessId,
        businessTradingName: business.tradingName,
        reviewId: contentReport.reviewId,
        reviewBody: businessReview.body,
        reviewRating: businessReview.rating,
        reason: contentReport.reason,
        details: contentReport.details,
        status: contentReport.status,
        reporterEmail: contentReport.reporterEmail,
        createdAt: contentReport.createdAt,
      })
      .from(contentReport)
      .innerJoin(businessReview, eq(businessReview.id, contentReport.reviewId))
      .innerJoin(business, eq(business.id, businessReview.businessId))
      .where(
        statusFilter
          ? and(
              isNull(contentReport.businessId),
              eq(contentReport.status, statusFilter),
            )
          : isNull(contentReport.businessId),
      )
      .orderBy(desc(contentReport.createdAt))
      .limit(200);

    const eventReports = await database
      .select({
        id: contentReport.id,
        businessId: businessEvent.businessId,
        businessTradingName: business.tradingName,
        eventId: contentReport.eventId,
        eventTitle: businessEvent.title,
        reason: contentReport.reason,
        details: contentReport.details,
        status: contentReport.status,
        reporterEmail: contentReport.reporterEmail,
        createdAt: contentReport.createdAt,
      })
      .from(contentReport)
      .innerJoin(businessEvent, eq(businessEvent.id, contentReport.eventId))
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .where(
        statusFilter
          ? and(
              isNull(contentReport.businessId),
              eq(contentReport.status, statusFilter),
            )
          : isNull(contentReport.businessId),
      )
      .orderBy(desc(contentReport.createdAt))
      .limit(200);

    const reports: ContentReportSummary[] = [
      ...businessReports.map((row) => ({
        ...row,
        businessId: row.businessId as string,
        targetType: "business" as const,
        reviewId: null,
        reviewBody: null,
        reviewRating: null,
        eventId: null,
        eventTitle: null,
      })),
      ...reviewReports.map((row) => ({
        ...row,
        businessId: row.businessId as string,
        targetType: "review" as const,
        eventId: null,
        eventTitle: null,
      })),
      ...eventReports.map((row) => ({
        ...row,
        businessId: row.businessId as string,
        targetType: "event" as const,
        reviewId: null,
        reviewBody: null,
        reviewRating: null,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { state: "ready", reports: reports.slice(0, 200) };
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
