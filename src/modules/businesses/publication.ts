import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessPublication,
  businessSite,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import { deriveCompletedOnboardingSteps } from "./onboarding-draft";
import { businessPermissions, canUserAccessBusiness } from "./permissions";

const requiredOnboardingSteps = [
  "profile",
  "location",
  "services",
  "hours",
] as const;

/**
 * Business lifecycle states this module transitions between. `business`,
 * `businessPublication` and `businessSite` are kept in lockstep by every
 * function below so the public directory's `status = "published"` filters
 * never observe a partially-updated record.
 */
export type BusinessLifecycleStatus =
  "draft" | "pending_review" | "published" | "rejected" | "suspended";

export type SubmitForReviewResult =
  | { status: "submitted" }
  | { status: "incomplete"; missingSteps: string[] }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "not_eligible"; currentStatus: string }
  | { status: "unavailable" };

/**
 * Owner-facing: submits a business's current onboarding draft for admin
 * review. This is also where a business's `businessSite` /
 * `businessPublication` rows are first created — nothing creates them
 * earlier in the product today, so the first submission doubles as
 * bootstrapping the publishable record from the draft.
 */
export async function submitBusinessForReview(input: {
  userId: string;
  businessId: string;
}): Promise<SubmitForReviewResult> {
  const authorised = await canUserAccessBusiness({
    userId: input.userId,
    businessId: input.businessId,
    permission: businessPermissions.publish,
  });
  if (!authorised) return { status: "forbidden" };

  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const [businessRow] = await transaction
        .select({
          id: business.id,
          slug: business.slug,
          status: business.status,
        })
        .from(business)
        .where(eq(business.id, input.businessId))
        .for("update")
        .limit(1);
      if (!businessRow) return { status: "not_found" } as const;

      if (businessRow.status !== "draft" && businessRow.status !== "rejected") {
        return {
          status: "not_eligible",
          currentStatus: businessRow.status,
        } as const;
      }

      const [draftRow] = await transaction
        .select()
        .from(businessOnboardingDraft)
        .where(eq(businessOnboardingDraft.businessId, input.businessId))
        .limit(1);

      const completed = draftRow
        ? deriveCompletedOnboardingSteps({
            profile: draftRow.profile as never,
            location: draftRow.location as never,
            services: draftRow.services as never,
            hours: draftRow.hours as never,
          })
        : [];
      const missingSteps = requiredOnboardingSteps.filter(
        (step) => !completed.includes(step),
      );
      if (missingSteps.length > 0) {
        return { status: "incomplete", missingSteps } as const;
      }

      let siteId: string | undefined;
      const [existingSite] = await transaction
        .select({ id: businessSite.id })
        .from(businessSite)
        .where(eq(businessSite.businessId, input.businessId))
        .limit(1);

      if (existingSite) {
        siteId = existingSite.id;
      } else {
        const [createdSite] = await transaction
          .insert(businessSite)
          .values({
            businessId: input.businessId,
            templateKey: "standard",
            platformPath: `/b/${businessRow.slug}`,
            status: "draft",
          })
          .returning({ id: businessSite.id });
        siteId = createdSite?.id;
      }
      if (!siteId) return { status: "unavailable" } as const;

      await transaction
        .insert(businessPublication)
        .values({
          businessId: input.businessId,
          businessSiteId: siteId,
          status: "pending_review",
          submittedAt: sql`now()`,
          submittedByUserId: input.userId,
          reviewedByUserId: null,
          moderationNote: null,
        })
        .onConflictDoUpdate({
          target: businessPublication.businessId,
          set: {
            status: "pending_review",
            submittedAt: sql`now()`,
            submittedByUserId: input.userId,
            reviewedByUserId: null,
            moderationNote: null,
            updatedAt: sql`now()`,
          },
        });

      await transaction
        .update(business)
        .set({ status: "pending_review", updatedAt: sql`now()` })
        .where(eq(business.id, input.businessId));

      return { status: "submitted" } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}

export type ApprovePublicationResult =
  | { status: "approved" }
  | { status: "not_pending" }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * Admin-facing. Callers must already have verified the actor is a
 * platform admin — this function trusts `adminUserId` and only enforces
 * the record's own state machine (must be pending review).
 */
export async function approveBusinessPublication(input: {
  adminUserId: string;
  businessId: string;
  note?: string;
}): Promise<ApprovePublicationResult> {
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const [publicationRow] = await transaction
        .select({
          status: businessPublication.status,
          businessSiteId: businessPublication.businessSiteId,
        })
        .from(businessPublication)
        .where(eq(businessPublication.businessId, input.businessId))
        .for("update")
        .limit(1);
      if (!publicationRow) return { status: "not_found" } as const;
      if (publicationRow.status !== "pending_review") {
        return { status: "not_pending" } as const;
      }

      await transaction
        .update(businessPublication)
        .set({
          status: "published",
          publishedAt: sql`now()`,
          lastReviewedAt: sql`now()`,
          reviewedByUserId: input.adminUserId,
          moderationNote: input.note ?? null,
          revisionNumber: sql`${businessPublication.revisionNumber} + 1`,
          updatedAt: sql`now()`,
        })
        .where(eq(businessPublication.businessId, input.businessId));

      await transaction
        .update(businessSite)
        .set({
          status: "published",
          publishedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(businessSite.id, publicationRow.businessSiteId));

      await transaction
        .update(business)
        .set({ status: "published", updatedAt: sql`now()` })
        .where(eq(business.id, input.businessId));

      return { status: "approved" } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}

export type RejectPublicationResult =
  | { status: "rejected" }
  | { status: "not_pending" }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function rejectBusinessPublication(input: {
  adminUserId: string;
  businessId: string;
  note: string;
}): Promise<RejectPublicationResult> {
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const [publicationRow] = await transaction
        .select({ status: businessPublication.status })
        .from(businessPublication)
        .where(eq(businessPublication.businessId, input.businessId))
        .for("update")
        .limit(1);
      if (!publicationRow) return { status: "not_found" } as const;
      if (publicationRow.status !== "pending_review") {
        return { status: "not_pending" } as const;
      }

      await transaction
        .update(businessPublication)
        .set({
          status: "rejected",
          lastReviewedAt: sql`now()`,
          reviewedByUserId: input.adminUserId,
          moderationNote: input.note,
          updatedAt: sql`now()`,
        })
        .where(eq(businessPublication.businessId, input.businessId));

      await transaction
        .update(business)
        .set({ status: "rejected", updatedAt: sql`now()` })
        .where(eq(business.id, input.businessId));

      return { status: "rejected" } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}

export type SuspendBusinessResult =
  | { status: "suspended" }
  | { status: "not_published" }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function suspendBusiness(input: {
  adminUserId: string;
  businessId: string;
  reason: string;
}): Promise<SuspendBusinessResult> {
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const [businessRow] = await transaction
        .select({ status: business.status })
        .from(business)
        .where(eq(business.id, input.businessId))
        .for("update")
        .limit(1);
      if (!businessRow) return { status: "not_found" } as const;
      if (businessRow.status !== "published") {
        return { status: "not_published" } as const;
      }

      await transaction
        .update(business)
        .set({
          status: "suspended",
          suspendedAt: sql`now()`,
          suspendedByUserId: input.adminUserId,
          suspensionReason: input.reason,
          updatedAt: sql`now()`,
        })
        .where(eq(business.id, input.businessId));

      return { status: "suspended" } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}

export type BusinessLifecycleSummary = {
  status: string;
  moderationNote: string | null;
  submittedAt: Date | null;
  suspensionReason: string | null;
};

/**
 * Owner-facing read used by the dashboard to show real publish status
 * instead of the static "coming later" copy the publish step used to
 * show before this workflow existed.
 */
export async function getBusinessLifecycleSummary(
  businessId: string,
): Promise<BusinessLifecycleSummary | null> {
  try {
    const database = getDatabase();
    const [businessRow] = await database
      .select({
        status: business.status,
        suspensionReason: business.suspensionReason,
      })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    if (!businessRow) return null;

    const [publicationRow] = await database
      .select({
        moderationNote: businessPublication.moderationNote,
        submittedAt: businessPublication.submittedAt,
      })
      .from(businessPublication)
      .where(eq(businessPublication.businessId, businessId))
      .limit(1);

    return {
      status: businessRow.status,
      suspensionReason: businessRow.suspensionReason,
      moderationNote: publicationRow?.moderationNote ?? null,
      submittedAt: publicationRow?.submittedAt ?? null,
    };
  } catch {
    return null;
  }
}

export type ReinstateBusinessResult =
  | { status: "reinstated" }
  | { status: "not_suspended" }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function reinstateBusiness(input: {
  businessId: string;
}): Promise<ReinstateBusinessResult> {
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const [businessRow] = await transaction
        .select({ status: business.status })
        .from(business)
        .where(eq(business.id, input.businessId))
        .for("update")
        .limit(1);
      if (!businessRow) return { status: "not_found" } as const;
      if (businessRow.status !== "suspended") {
        return { status: "not_suspended" } as const;
      }

      await transaction
        .update(business)
        .set({
          status: "published",
          suspendedAt: null,
          suspendedByUserId: null,
          suspensionReason: null,
          updatedAt: sql`now()`,
        })
        .where(eq(business.id, input.businessId));

      return { status: "reinstated" } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}
