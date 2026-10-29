import "server-only";
import { and, count, desc, eq, isNull, ne } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
  businessUpdate,
} from "@/lib/database/schema/business-operations";
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

export const offerReportReasons = [
  "misleading_or_scam",
  "incorrect_details",
  "not_available",
  "inappropriate_content",
  "other",
] as const;
export type OfferReportReason = (typeof offerReportReasons)[number];

export const updateReportReasons = [
  "abusive_or_offensive",
  "spam_or_advertising",
  "misleading_or_scam",
  "incorrect_details",
  "other",
] as const;
export type UpdateReportReason = (typeof updateReportReasons)[number];

/** Open reports kept per item: more add nothing for a moderator to act on. */
export const MAX_OPEN_REPORTS_PER_TARGET = 25;

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

export const submitOfferReportInputSchema = z.object({
  offerId: z.uuid(),
  reason: z.enum(offerReportReasons),
  details: z.string().trim().max(1000).optional(),
  reporterEmail: z.union([z.email().max(254), z.literal("")]).optional(),
  reporterUserId: z.uuid().optional(),
});

export const submitUpdateReportInputSchema = z.object({
  updateId: z.uuid(),
  reason: z.enum(updateReportReasons),
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

/**
 * Public-facing: anyone can report an offer, signed in or not. Only accepts
 * reports against offers that are currently active, so a draft, paused or
 * already-removed offer (and a guessed id) never reaches the queue. A person
 * who already has an open report on the same offer, and an offer that already
 * has the maximum open, are acknowledged without adding another row.
 */
export async function submitOfferReport(
  rawInput: z.infer<typeof submitOfferReportInputSchema>,
): Promise<SubmitReportResult> {
  const parsed = submitOfferReportInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "unavailable" };
  const input = parsed.data;

  try {
    const database = getDatabase();
    const [offerRow] = await database
      .select({ id: businessOffer.id })
      .from(businessOffer)
      .where(
        and(
          eq(businessOffer.id, input.offerId),
          eq(businessOffer.status, "active"),
        ),
      )
      .limit(1);
    if (!offerRow) return { status: "not_found" };

    if (
      await alreadyReported(eq(contentReport.offerId, input.offerId), input)
    ) {
      return { status: "submitted" };
    }
    await database.insert(contentReport).values({
      offerId: input.offerId,
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

/** Same rules as offers, for business updates that are currently published. */
export async function submitUpdateReport(
  rawInput: z.infer<typeof submitUpdateReportInputSchema>,
): Promise<SubmitReportResult> {
  const parsed = submitUpdateReportInputSchema.safeParse(rawInput);
  if (!parsed.success) return { status: "unavailable" };
  const input = parsed.data;

  try {
    const database = getDatabase();
    const [updateRow] = await database
      .select({ id: businessUpdate.id })
      .from(businessUpdate)
      .where(
        and(
          eq(businessUpdate.id, input.updateId),
          eq(businessUpdate.status, "published"),
        ),
      )
      .limit(1);
    if (!updateRow) return { status: "not_found" };

    if (
      await alreadyReported(eq(contentReport.updateId, input.updateId), input)
    ) {
      return { status: "submitted" };
    }
    await database.insert(contentReport).values({
      updateId: input.updateId,
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
 * True when this reporter already has an open report on the item (matched by
 * account, or by email address when signed out) or the item already has the
 * maximum number of open reports.
 */
async function alreadyReported(
  target: SQL,
  reporter: { reporterUserId?: string; reporterEmail?: string },
): Promise<boolean> {
  const open = await getDatabase()
    .select({
      reporterUserId: contentReport.reporterUserId,
      reporterEmail: contentReport.reporterEmail,
    })
    .from(contentReport)
    .where(and(target, eq(contentReport.status, "open")))
    .limit(MAX_OPEN_REPORTS_PER_TARGET);
  if (open.length >= MAX_OPEN_REPORTS_PER_TARGET) return true;
  const email = reporter.reporterEmail?.trim().toLowerCase();
  return open.some(
    (row) =>
      (reporter.reporterUserId &&
        row.reporterUserId === reporter.reporterUserId) ||
      (email && row.reporterEmail?.toLowerCase() === email),
  );
}

export type ContentReportSummary = {
  id: string;
  targetType: "business" | "review" | "event" | "offer" | "update";
  businessId: string;
  businessTradingName: string;
  reviewId: string | null;
  reviewBody: string | null;
  reviewRating: number | null;
  eventId: string | null;
  eventTitle: string | null;
  offerId: string | null;
  offerTitle: string | null;
  updateId: string | null;
  updateTitle: string | null;
  /** The reported item's current status; "removed" means an admin took it down. */
  targetStatus: string | null;
  reason: string;
  details: string | null;
  status: string;
  reporterEmail: string | null;
  createdAt: Date;
};

const noOfferOrUpdate = {
  offerId: null,
  offerTitle: null,
  updateId: null,
  updateTitle: null,
} as const;

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
        targetStatus: businessEvent.status,
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

    const offerReports = await database
      .select({
        id: contentReport.id,
        businessId: businessOffer.businessId,
        businessTradingName: business.tradingName,
        offerId: contentReport.offerId,
        offerTitle: businessOffer.title,
        targetStatus: businessOffer.status,
        reason: contentReport.reason,
        details: contentReport.details,
        status: contentReport.status,
        reporterEmail: contentReport.reporterEmail,
        createdAt: contentReport.createdAt,
      })
      .from(contentReport)
      .innerJoin(businessOffer, eq(businessOffer.id, contentReport.offerId))
      .innerJoin(business, eq(business.id, businessOffer.businessId))
      .where(statusFilter ? eq(contentReport.status, statusFilter) : undefined)
      .orderBy(desc(contentReport.createdAt))
      .limit(200);

    const updateReports = await database
      .select({
        id: contentReport.id,
        businessId: businessUpdate.businessId,
        businessTradingName: business.tradingName,
        updateId: contentReport.updateId,
        updateTitle: businessUpdate.title,
        targetStatus: businessUpdate.status,
        reason: contentReport.reason,
        details: contentReport.details,
        status: contentReport.status,
        reporterEmail: contentReport.reporterEmail,
        createdAt: contentReport.createdAt,
      })
      .from(contentReport)
      .innerJoin(businessUpdate, eq(businessUpdate.id, contentReport.updateId))
      .innerJoin(business, eq(business.id, businessUpdate.businessId))
      .where(statusFilter ? eq(contentReport.status, statusFilter) : undefined)
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
        ...noOfferOrUpdate,
        targetStatus: null,
      })),
      ...reviewReports.map((row) => ({
        ...row,
        businessId: row.businessId as string,
        targetType: "review" as const,
        eventId: null,
        eventTitle: null,
        ...noOfferOrUpdate,
        targetStatus: null,
      })),
      ...eventReports.map((row) => ({
        ...row,
        businessId: row.businessId as string,
        targetType: "event" as const,
        reviewId: null,
        reviewBody: null,
        reviewRating: null,
        ...noOfferOrUpdate,
      })),
      ...offerReports.map((row) => ({
        ...row,
        targetType: "offer" as const,
        reviewId: null,
        reviewBody: null,
        reviewRating: null,
        eventId: null,
        eventTitle: null,
        updateId: null,
        updateTitle: null,
      })),
      ...updateReports.map((row) => ({
        ...row,
        targetType: "update" as const,
        reviewId: null,
        reviewBody: null,
        reviewRating: null,
        eventId: null,
        eventTitle: null,
        offerId: null,
        offerTitle: null,
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

export type ReportedContentKind = "event" | "offer" | "update";

export type RemoveReportedContentResult =
  | { status: "removed"; kind: ReportedContentKind; targetId: string }
  | { status: "not_found" }
  | { status: "unavailable" };

export type RemoveReportedEventResult = RemoveReportedContentResult;

const reportedTarget = {
  event: {
    reportColumn: contentReport.eventId,
    table: businessEvent,
    id: businessEvent.id,
    status: businessEvent.status,
    restoredStatus: "hidden",
    note: "Event removed by an administrator.",
  },
  offer: {
    reportColumn: contentReport.offerId,
    table: businessOffer,
    id: businessOffer.id,
    status: businessOffer.status,
    restoredStatus: "hidden",
    note: "Offer removed by an administrator.",
  },
  update: {
    reportColumn: contentReport.updateId,
    table: businessUpdate,
    id: businessUpdate.id,
    status: businessUpdate.status,
    restoredStatus: "draft",
    note: "Update removed by an administrator.",
  },
} as const;

/**
 * Administrator takedown of the event, offer or update named by a report. The
 * item moves to the owner-locked "removed" status (so it leaves every public
 * surface and the owner cannot edit, republish or delete it), and every open
 * report against it is resolved in the same transaction. Removing an item
 * that is already removed is "not_found", so a double click changes nothing.
 */
export async function removeReportedContent(input: {
  kind: ReportedContentKind;
  reportId: string;
  adminUserId: string;
  note?: string;
}): Promise<RemoveReportedContentResult> {
  const target = reportedTarget[input.kind];
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const [report] = await transaction
        .select({ targetId: target.reportColumn })
        .from(contentReport)
        .where(eq(contentReport.id, input.reportId));
      if (!report?.targetId) return { status: "not_found" as const };

      const [removed] = await transaction
        .update(target.table)
        .set({ status: "removed", updatedAt: new Date() })
        .where(
          and(eq(target.id, report.targetId), ne(target.status, "removed")),
        )
        .returning({ id: target.id });
      if (!removed) return { status: "not_found" as const };

      await transaction
        .update(contentReport)
        .set({
          status: "resolved",
          resolvedByUserId: input.adminUserId,
          resolutionNote: input.note ?? target.note,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(target.reportColumn, report.targetId),
            eq(contentReport.status, "open"),
          ),
        );
      return {
        status: "removed" as const,
        kind: input.kind,
        targetId: removed.id,
      };
    });
  } catch {
    return { status: "unavailable" };
  }
}

export function removeReportedEvent(input: {
  reportId: string;
  adminUserId: string;
  note?: string;
}): Promise<RemoveReportedContentResult> {
  return removeReportedContent({ ...input, kind: "event" });
}

export type RestoreReportedContentResult =
  | { status: "restored"; kind: ReportedContentKind; targetId: string }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * Undoes a takedown made by mistake. The item comes back as a draft (update)
 * or paused (event, offer) rather than live, so the owner decides when it is
 * public again; nothing is republished or announced by the restore itself.
 * Only an item that is still "removed" can be restored.
 */
export async function restoreReportedContent(input: {
  kind: ReportedContentKind;
  reportId: string;
}): Promise<RestoreReportedContentResult> {
  const target = reportedTarget[input.kind];
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const [report] = await transaction
        .select({ targetId: target.reportColumn })
        .from(contentReport)
        .where(eq(contentReport.id, input.reportId));
      if (!report?.targetId) return { status: "not_found" as const };
      const [restored] = await transaction
        .update(target.table)
        .set({ status: target.restoredStatus, updatedAt: new Date() })
        .where(
          and(eq(target.id, report.targetId), eq(target.status, "removed")),
        )
        .returning({ id: target.id });
      return restored
        ? {
            status: "restored" as const,
            kind: input.kind,
            targetId: restored.id,
          }
        : { status: "not_found" as const };
    });
  } catch {
    return { status: "unavailable" };
  }
}
