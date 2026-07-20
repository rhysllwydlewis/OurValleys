import "server-only";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  businessPublication,
  category,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";

export type ModerationBusinessSummary = {
  id: string;
  tradingName: string;
  slug: string;
  status: string;
  categoryName: string;
  isDemo: boolean;
  updatedAt: Date;
  submittedAt: Date | null;
};

export type ModerationListResult =
  | { state: "ready"; businesses: ModerationBusinessSummary[] }
  | { state: "unavailable"; businesses: [] };

const moderationStatuses = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "suspended",
] as const;
export type ModerationStatusFilter = (typeof moderationStatuses)[number];

export function isModerationStatusFilter(
  value: string,
): value is ModerationStatusFilter {
  return (moderationStatuses as readonly string[]).includes(value);
}

export async function listBusinessesForModeration(
  statusFilter?: ModerationStatusFilter,
): Promise<ModerationListResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: business.id,
        tradingName: business.tradingName,
        slug: business.slug,
        status: business.status,
        categoryName: category.name,
        isDemo: business.isDemo,
        updatedAt: business.updatedAt,
        submittedAt: businessPublication.submittedAt,
      })
      .from(business)
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .leftJoin(
        businessPublication,
        eq(businessPublication.businessId, business.id),
      )
      .where(statusFilter ? eq(business.status, statusFilter) : undefined)
      .orderBy(desc(business.updatedAt))
      .limit(200);

    return { state: "ready", businesses: rows };
  } catch {
    return { state: "unavailable", businesses: [] };
  }
}

export type ModerationCounts = {
  pendingReview: number;
  published: number;
  suspended: number;
  total: number;
};

export async function getModerationCounts(): Promise<ModerationCounts> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({ status: business.status, value: count() })
      .from(business)
      .groupBy(business.status);

    const byStatus = new Map(rows.map((row) => [row.status, row.value]));
    const total = rows.reduce((sum, row) => sum + row.value, 0);

    return {
      pendingReview: byStatus.get("pending_review") ?? 0,
      published: byStatus.get("published") ?? 0,
      suspended: byStatus.get("suspended") ?? 0,
      total,
    };
  } catch {
    return { pendingReview: 0, published: 0, suspended: 0, total: 0 };
  }
}

export type ModerationBusinessDetail = ModerationBusinessSummary & {
  summary: string;
  publication: {
    status: string;
    submittedAt: Date | null;
    submittedBy: { name: string; email: string } | null;
    reviewedAt: Date | null;
    reviewedBy: { name: string; email: string } | null;
    moderationNote: string | null;
    publishedAt: Date | null;
    revisionNumber: number;
  } | null;
  suspension: {
    suspendedAt: Date | null;
    suspendedBy: { name: string; email: string } | null;
    reason: string | null;
  };
  owners: { userId: string; name: string; email: string }[];
  onboardingDraft: {
    profile: unknown;
    location: unknown;
    services: unknown;
    hours: unknown;
  } | null;
};

export type ModerationDetailResult =
  | { state: "ready"; business: ModerationBusinessDetail }
  | { state: "missing" }
  | { state: "unavailable" };

export async function getBusinessModerationDetail(
  businessId: string,
): Promise<ModerationDetailResult> {
  try {
    const database = getDatabase();

    const [businessRow] = await database
      .select({
        id: business.id,
        tradingName: business.tradingName,
        slug: business.slug,
        status: business.status,
        summary: business.summary,
        categoryName: category.name,
        isDemo: business.isDemo,
        updatedAt: business.updatedAt,
        suspendedAt: business.suspendedAt,
        suspensionReason: business.suspensionReason,
        suspendedByName: user.name,
        suspendedByEmail: user.email,
      })
      .from(business)
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .leftJoin(user, eq(user.id, business.suspendedByUserId))
      .where(eq(business.id, businessId))
      .limit(1);

    if (!businessRow) return { state: "missing" };

    const [publicationRow] = await database
      .select({
        status: businessPublication.status,
        submittedAt: businessPublication.submittedAt,
        reviewedAt: businessPublication.lastReviewedAt,
        moderationNote: businessPublication.moderationNote,
        publishedAt: businessPublication.publishedAt,
        revisionNumber: businessPublication.revisionNumber,
        submittedByUserId: businessPublication.submittedByUserId,
        reviewedByUserId: businessPublication.reviewedByUserId,
      })
      .from(businessPublication)
      .where(eq(businessPublication.businessId, businessId))
      .limit(1);

    const reviewerIds = [
      publicationRow?.submittedByUserId,
      publicationRow?.reviewedByUserId,
    ].filter((id): id is string => Boolean(id));
    const reviewers = reviewerIds.length
      ? await database
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(inArray(user.id, reviewerIds))
      : [];
    const reviewerById = new Map(reviewers.map((row) => [row.id, row]));

    const owners = await database
      .select({
        userId: businessMembership.userId,
        name: user.name,
        email: user.email,
      })
      .from(businessMembership)
      .innerJoin(user, eq(user.id, businessMembership.userId))
      .where(
        and(
          eq(businessMembership.businessId, businessId),
          eq(businessMembership.role, "owner"),
        ),
      );

    const [draftRow] = await database
      .select({
        profile: businessOnboardingDraft.profile,
        location: businessOnboardingDraft.location,
        services: businessOnboardingDraft.services,
        hours: businessOnboardingDraft.hours,
      })
      .from(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, businessId))
      .limit(1);

    return {
      state: "ready",
      business: {
        id: businessRow.id,
        tradingName: businessRow.tradingName,
        slug: businessRow.slug,
        status: businessRow.status,
        summary: businessRow.summary,
        categoryName: businessRow.categoryName,
        isDemo: businessRow.isDemo,
        updatedAt: businessRow.updatedAt,
        submittedAt: publicationRow?.submittedAt ?? null,
        publication: publicationRow
          ? {
              status: publicationRow.status,
              submittedAt: publicationRow.submittedAt,
              submittedBy: publicationRow.submittedByUserId
                ? (reviewerById.get(publicationRow.submittedByUserId) ?? null)
                : null,
              reviewedAt: publicationRow.reviewedAt,
              reviewedBy: publicationRow.reviewedByUserId
                ? (reviewerById.get(publicationRow.reviewedByUserId) ?? null)
                : null,
              moderationNote: publicationRow.moderationNote,
              publishedAt: publicationRow.publishedAt,
              revisionNumber: publicationRow.revisionNumber,
            }
          : null,
        suspension: {
          suspendedAt: businessRow.suspendedAt,
          suspendedBy: businessRow.suspendedByName
            ? {
                name: businessRow.suspendedByName,
                email: businessRow.suspendedByEmail!,
              }
            : null,
          reason: businessRow.suspensionReason,
        },
        owners,
        onboardingDraft: draftRow ?? null,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
