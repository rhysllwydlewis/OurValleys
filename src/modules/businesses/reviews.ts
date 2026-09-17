import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business } from "@/lib/database/schema/business";
import { businessReview } from "@/lib/database/schema/business-reviews";

const identifierSchema = z.uuid();

export type ReviewStatus = "published" | "hidden";

export const submitReviewInputSchema = z.object({
  businessId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
});

export type SubmitReviewResult =
  | { status: "submitted" }
  | { status: "not_found" }
  | { status: "invalid" }
  | { status: "unavailable" };

/**
 * One review per resident per business: resubmitting replaces the existing
 * row (and un-hides it, mirroring how most review sites treat an edit as a
 * fresh publication) rather than creating a duplicate.
 */
export async function submitBusinessReview(
  userId: string,
  rawInput: z.infer<typeof submitReviewInputSchema>,
): Promise<SubmitReviewResult> {
  const parsedUserId = identifierSchema.safeParse(userId);
  const parsed = submitReviewInputSchema.safeParse(rawInput);
  if (!parsedUserId.success || !parsed.success) return { status: "invalid" };
  const input = parsed.data;

  try {
    const database = getDatabase();
    const [businessRow] = await database
      .select({ id: business.id })
      .from(business)
      .where(eq(business.id, input.businessId))
      .limit(1);
    if (!businessRow) return { status: "not_found" };

    const body = input.body ? input.body : null;
    await database
      .insert(businessReview)
      .values({
        businessId: input.businessId,
        userId: parsedUserId.data,
        rating: input.rating,
        body,
      })
      .onConflictDoUpdate({
        target: [businessReview.businessId, businessReview.userId],
        set: {
          rating: input.rating,
          body,
          status: "published",
          updatedAt: new Date(),
        },
      });

    return { status: "submitted" };
  } catch {
    return { status: "unavailable" };
  }
}

export type DeleteReviewResult =
  "removed" | "not_found" | "invalid" | "unavailable";

export async function deleteOwnReview(
  userId: string,
  businessId: string,
): Promise<DeleteReviewResult> {
  const parsedUserId = identifierSchema.safeParse(userId);
  const parsedBusinessId = identifierSchema.safeParse(businessId);
  if (!parsedUserId.success || !parsedBusinessId.success) return "invalid";

  try {
    const database = getDatabase();
    const rows = await database
      .delete(businessReview)
      .where(
        and(
          eq(businessReview.userId, parsedUserId.data),
          eq(businessReview.businessId, parsedBusinessId.data),
        ),
      )
      .returning({ id: businessReview.id });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export type OwnReview = { rating: number; body: string | null };

export async function getOwnReviewForBusiness(
  userId: string,
  businessId: string,
): Promise<OwnReview | null> {
  const parsedUserId = identifierSchema.safeParse(userId);
  const parsedBusinessId = identifierSchema.safeParse(businessId);
  if (!parsedUserId.success || !parsedBusinessId.success) return null;

  try {
    const database = getDatabase();
    const [row] = await database
      .select({ rating: businessReview.rating, body: businessReview.body })
      .from(businessReview)
      .where(
        and(
          eq(businessReview.userId, parsedUserId.data),
          eq(businessReview.businessId, parsedBusinessId.data),
        ),
      )
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export type BusinessReviewSummary = {
  id: string;
  rating: number;
  body: string | null;
  reviewerName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ListReviewsResult =
  | { state: "ready"; reviews: BusinessReviewSummary[] }
  | { state: "unavailable"; reviews: [] };

export async function listPublishedReviewsForBusiness(
  businessId: string,
): Promise<ListReviewsResult> {
  const parsedBusinessId = identifierSchema.safeParse(businessId);
  if (!parsedBusinessId.success) return { state: "unavailable", reviews: [] };

  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: businessReview.id,
        rating: businessReview.rating,
        body: businessReview.body,
        reviewerName: user.name,
        createdAt: businessReview.createdAt,
        updatedAt: businessReview.updatedAt,
      })
      .from(businessReview)
      .innerJoin(user, eq(user.id, businessReview.userId))
      .where(
        and(
          eq(businessReview.businessId, parsedBusinessId.data),
          eq(businessReview.status, "published"),
        ),
      )
      .orderBy(desc(businessReview.createdAt))
      .limit(100);
    return { state: "ready", reviews: rows };
  } catch {
    return { state: "unavailable", reviews: [] };
  }
}

export type BusinessRatingSummary = { average: number | null; count: number };

export async function getBusinessRatingSummary(
  businessId: string,
): Promise<BusinessRatingSummary> {
  const parsedBusinessId = identifierSchema.safeParse(businessId);
  if (!parsedBusinessId.success) return { average: null, count: 0 };

  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        average: sql<string | null>`avg(${businessReview.rating})`,
        total: count(),
      })
      .from(businessReview)
      .where(
        and(
          eq(businessReview.businessId, parsedBusinessId.data),
          eq(businessReview.status, "published"),
        ),
      );
    return {
      average: row?.average != null ? Number(row.average) : null,
      count: row?.total ?? 0,
    };
  } catch {
    return { average: null, count: 0 };
  }
}

export type AdminReviewSummary = {
  id: string;
  businessId: string;
  businessTradingName: string;
  reviewerName: string;
  rating: number;
  body: string | null;
  status: ReviewStatus;
  createdAt: Date;
};

export type AdminReviewListResult =
  | { state: "ready"; reviews: AdminReviewSummary[] }
  | { state: "unavailable"; reviews: [] };

export async function listReviewsForModeration(
  statusFilter?: ReviewStatus,
): Promise<AdminReviewListResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: businessReview.id,
        businessId: businessReview.businessId,
        businessTradingName: business.tradingName,
        reviewerName: user.name,
        rating: businessReview.rating,
        body: businessReview.body,
        status: businessReview.status,
        createdAt: businessReview.createdAt,
      })
      .from(businessReview)
      .innerJoin(business, eq(business.id, businessReview.businessId))
      .innerJoin(user, eq(user.id, businessReview.userId))
      .where(statusFilter ? eq(businessReview.status, statusFilter) : undefined)
      .orderBy(desc(businessReview.createdAt))
      .limit(200);
    return {
      state: "ready",
      reviews: rows.map((row) => ({
        ...row,
        status: row.status as ReviewStatus,
      })),
    };
  } catch {
    return { state: "unavailable", reviews: [] };
  }
}

export type ModerateReviewResult =
  "updated" | "not_found" | "invalid" | "unavailable";

async function setReviewStatus(input: {
  reviewId: string;
  adminUserId: string;
  status: ReviewStatus;
  reason?: string;
}): Promise<ModerateReviewResult> {
  const parsedReviewId = identifierSchema.safeParse(input.reviewId);
  const parsedAdminUserId = identifierSchema.safeParse(input.adminUserId);
  if (!parsedReviewId.success || !parsedAdminUserId.success) return "invalid";

  try {
    const database = getDatabase();
    const [updated] = await database
      .update(businessReview)
      .set({
        status: input.status,
        hiddenByUserId:
          input.status === "hidden" ? parsedAdminUserId.data : null,
        hiddenReason: input.status === "hidden" ? (input.reason ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(businessReview.id, parsedReviewId.data))
      .returning({ id: businessReview.id });
    return updated ? "updated" : "not_found";
  } catch {
    return "unavailable";
  }
}

export function hideReview(input: {
  reviewId: string;
  adminUserId: string;
  reason?: string;
}): Promise<ModerateReviewResult> {
  return setReviewStatus({ ...input, status: "hidden" });
}

export function restoreReview(input: {
  reviewId: string;
  adminUserId: string;
}): Promise<ModerateReviewResult> {
  return setReviewStatus({ ...input, status: "published" });
}
