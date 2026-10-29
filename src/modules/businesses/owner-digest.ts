import "server-only";
import { raiseNotification } from "@/modules/residents/notifications";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { withSessionAdvisoryLock } from "@/lib/database/advisory-lock";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, businessMembership } from "@/lib/database/schema/business";
import {
  businessEnquiry,
  businessLifecycle,
} from "@/lib/database/schema/business-operations";
import { sendTransactionalEmail } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/notification-unsubscribe";
import { getSiteUrl } from "@/lib/site";
import { getBusinessAnalyticsSummary } from "./analytics";

const DAY_MS = 86_400_000;

/** A business is never mailed twice inside this window. */
export const OWNER_DIGEST_MIN_INTERVAL_DAYS = 6;
export const OWNER_DIGEST_PERIOD_DAYS = 7;

export type OwnerDigestContent = {
  periodDays: number;
  views: number;
  contactActions: number;
  enquiries: number;
  /** Enquiries still waiting for a first reply, of any age. */
  awaitingReply: number;
};

/** Nothing to report: no activity this week and nothing waiting on the owner. */
export function isOwnerDigestEmpty(content: OwnerDigestContent): boolean {
  return (
    content.views === 0 &&
    content.contactActions === 0 &&
    content.enquiries === 0 &&
    content.awaitingReply === 0
  );
}

/**
 * Plain-text, counts only: no visitor-level data and no enquiry content.
 */
export function composeOwnerDigestEmail(input: {
  businessId: string;
  businessName: string;
  content: OwnerDigestContent;
  unsubscribeUrl: string;
  siteUrl?: URL;
}): { subject: string; text: string } {
  const siteUrl = input.siteUrl ?? getSiteUrl();
  const { content } = input;
  const link = (path: string) => new URL(path, siteUrl).toString();
  const lines = [
    `How ${input.businessName} did on OurValleys in the last ${content.periodDays} days.`,
    "",
    `- Page views: ${content.views}`,
    `- Calls, directions and other contact taps: ${content.contactActions}`,
    `- New enquiries: ${content.enquiries}`,
  ];
  if (content.awaitingReply > 0) {
    lines.push(
      "",
      content.awaitingReply === 1
        ? "1 enquiry is still waiting for a reply."
        : `${content.awaitingReply} enquiries are still waiting for a reply.`,
      `Reply: ${link(`/dashboard/business/${input.businessId}/operations/enquiries`)}`,
    );
  }
  lines.push(
    "",
    `Full figures: ${link(`/dashboard/business/${input.businessId}/insights`)}`,
    "",
    "You are receiving this because the weekly summary is turned on for this business.",
    `Stop these emails: ${input.unsubscribeUrl}`,
  );
  return {
    subject: `Your weekly summary for ${input.businessName}`,
    text: lines.join("\n"),
  };
}

async function countAwaitingReply(businessId: string): Promise<number> {
  const [row] = await getDatabase()
    .select({ count: sql<number>`count(*)::int` })
    .from(businessEnquiry)
    .where(
      and(
        eq(businessEnquiry.businessId, businessId),
        inArray(businessEnquiry.status, ["new", "read"]),
      ),
    );
  return row?.count ?? 0;
}

export async function loadOwnerDigestContent(
  businessId: string,
  now: Date = new Date(),
): Promise<OwnerDigestContent> {
  const [summary, awaitingReply] = await Promise.all([
    getBusinessAnalyticsSummary(businessId, OWNER_DIGEST_PERIOD_DAYS, now),
    countAwaitingReply(businessId),
  ]);
  return {
    periodDays: OWNER_DIGEST_PERIOD_DAYS,
    views: summary.totalViews,
    contactActions: summary.contactActions,
    enquiries: summary.enquiries,
    awaitingReply,
  };
}

export type OwnerDigestResult = {
  businesses: number;
  sent: number;
  skippedEmpty: number;
  failed: number;
};

/**
 * Sends the opt-in weekly summary to the active owners of each published
 * business that turned it on. Idempotent per week: the business's sent
 * timestamp only advances once at least one owner was mailed, so a failed
 * run retries next time, and a business with nothing to report is skipped
 * without being advanced. One pass at a time across every worker.
 */
export async function runOwnerDigest(
  now = new Date(),
): Promise<OwnerDigestResult> {
  return withSessionAdvisoryLock("business-owner-digest", () =>
    runOwnerDigestPass(now),
  );
}

async function runOwnerDigestPass(now: Date): Promise<OwnerDigestResult> {
  const database = getDatabase();
  const dueBefore = new Date(
    now.getTime() - OWNER_DIGEST_MIN_INTERVAL_DAYS * DAY_MS,
  );
  const result: OwnerDigestResult = {
    businesses: 0,
    sent: 0,
    skippedEmpty: 0,
    failed: 0,
  };

  const due = await database
    .select({ id: business.id, name: business.tradingName })
    .from(businessLifecycle)
    .innerJoin(business, eq(business.id, businessLifecycle.businessId))
    .where(
      and(
        eq(businessLifecycle.weeklyDigestEnabled, true),
        eq(business.status, "published"),
        isNull(business.suspendedAt),
        or(
          isNull(businessLifecycle.weeklyDigestSentAt),
          lt(businessLifecycle.weeklyDigestSentAt, dueBefore),
        ),
      ),
    );
  result.businesses = due.length;

  for (const item of due) {
    try {
      const content = await loadOwnerDigestContent(item.id, now);
      if (isOwnerDigestEmpty(content)) {
        result.skippedEmpty += 1;
        continue;
      }
      const owners = await database
        .select({ id: user.id, email: user.email })
        .from(businessMembership)
        .innerJoin(user, eq(user.id, businessMembership.userId))
        .where(
          and(
            eq(businessMembership.businessId, item.id),
            eq(businessMembership.role, "owner"),
            eq(businessMembership.status, "active"),
            eq(user.emailVerified, true),
            eq(user.banned, false),
          ),
        );
      const outcomes = await Promise.allSettled(
        owners.map((owner) => {
          const message = composeOwnerDigestEmail({
            businessId: item.id,
            businessName: item.name,
            content,
            unsubscribeUrl: buildUnsubscribeUrl(
              "business_digest",
              `${item.id}.${owner.id}`,
            ),
          });
          return sendTransactionalEmail({
            category: "business_digest",
            to: owner.email,
            ...message,
          });
        }),
      );
      if (!outcomes.some((outcome) => outcome.status === "fulfilled")) {
        result.failed += 1;
        continue;
      }
      await Promise.all(
        owners.map((owner) =>
          raiseNotification(owner.id, {
            kind: "owner_digest",
            params: {
              business: item.name,
              views: content.views,
              enquiries: content.enquiries,
              awaiting: content.awaitingReply,
            },
            href: `/dashboard/business/${item.id}/insights`,
            dedupeKey: `owner-digest:${item.id}:${now.toISOString().slice(0, 10)}`,
          }),
        ),
      );
      await database
        .update(businessLifecycle)
        .set({ weeklyDigestSentAt: now })
        .where(eq(businessLifecycle.businessId, item.id));
      result.sent += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}

export async function configureWeeklyDigest(input: {
  businessId: string;
  enabled: boolean;
}): Promise<"updated" | "unavailable"> {
  try {
    await getDatabase()
      .insert(businessLifecycle)
      .values({
        businessId: input.businessId,
        weeklyDigestEnabled: input.enabled,
      })
      .onConflictDoUpdate({
        target: businessLifecycle.businessId,
        set: { weeklyDigestEnabled: input.enabled, updatedAt: sql`now()` },
      });
    return "updated";
  } catch {
    return "unavailable";
  }
}
