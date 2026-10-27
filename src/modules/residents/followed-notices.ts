import "server-only";
import { and, asc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business } from "@/lib/database/schema/business";
import {
  businessEvent,
  businessOffer,
  businessUpdate,
} from "@/lib/database/schema/business-operations";
import { jobCursor } from "@/lib/database/schema/job-cursor";
import { savedBusiness } from "@/lib/database/schema/saved-discovery";
import {
  composeFollowNotices,
  FOLLOW_CURSOR_NAME,
  FOLLOW_SCAN_LIMIT,
  resolveFollowWindow,
  type FollowCandidate,
} from "./following-model";
import { raiseNotification } from "./notifications";

/** Savers who may be told: verified, not banned, and have not muted it. */
function followerCondition() {
  return and(
    eq(savedBusiness.notify, true),
    eq(user.emailVerified, true),
    eq(user.banned, false),
    eq(business.status, "published"),
    eq(business.isDemo, false),
    isNull(business.suspendedAt),
  );
}

export type FollowedNoticesResult = {
  candidates: number;
  raised: number;
};

/**
 * Raises an in-site notice for every person who saved a business when that
 * business publishes an update or adds an offer or event. The cursor makes
 * each run cover exactly the time since the last one, and the notice's
 * dedupe key makes a retried or overlapping run harmless. The cursor only
 * advances after every notice for the window was written, so a failure is
 * retried with the same window.
 */
export async function runFollowedNotices(
  now = new Date(),
): Promise<FollowedNoticesResult> {
  const database = getDatabase();
  const [stored] = await database
    .select({ cursorAt: jobCursor.cursorAt })
    .from(jobCursor)
    .where(eq(jobCursor.name, FOLLOW_CURSOR_NAME));
  const { since, until } = resolveFollowWindow(stored?.cursorAt ?? null, now);

  const base = {
    userId: savedBusiness.userId,
    businessName: business.tradingName,
    businessSlug: business.slug,
  };

  const updates = await database
    .select({
      ...base,
      itemId: businessUpdate.id,
      title: businessUpdate.title,
      createdAt: businessUpdate.publishedAt,
    })
    .from(savedBusiness)
    .innerJoin(user, eq(user.id, savedBusiness.userId))
    .innerJoin(business, eq(business.id, savedBusiness.businessId))
    .innerJoin(businessUpdate, eq(businessUpdate.businessId, business.id))
    .where(
      and(
        followerCondition(),
        eq(businessUpdate.status, "published"),
        gt(businessUpdate.publishedAt, since),
        lte(businessUpdate.publishedAt, until),
      ),
    )
    .orderBy(asc(businessUpdate.publishedAt))
    .limit(FOLLOW_SCAN_LIMIT);

  const offers = await database
    .select({
      ...base,
      itemId: businessOffer.id,
      title: businessOffer.title,
      createdAt: businessOffer.createdAt,
    })
    .from(savedBusiness)
    .innerJoin(user, eq(user.id, savedBusiness.userId))
    .innerJoin(business, eq(business.id, savedBusiness.businessId))
    .innerJoin(businessOffer, eq(businessOffer.businessId, business.id))
    .where(
      and(
        followerCondition(),
        eq(businessOffer.status, "active"),
        gt(businessOffer.createdAt, since),
        lte(businessOffer.createdAt, until),
        or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, until)),
        or(isNull(businessOffer.endsAt), gt(businessOffer.endsAt, until)),
      ),
    )
    .orderBy(asc(businessOffer.createdAt))
    .limit(FOLLOW_SCAN_LIMIT);

  const events = await database
    .select({
      ...base,
      itemId: businessEvent.id,
      title: businessEvent.title,
      startsAt: businessEvent.startsAt,
      createdAt: businessEvent.createdAt,
    })
    .from(savedBusiness)
    .innerJoin(user, eq(user.id, savedBusiness.userId))
    .innerJoin(business, eq(business.id, savedBusiness.businessId))
    .innerJoin(businessEvent, eq(businessEvent.businessId, business.id))
    .where(
      and(
        followerCondition(),
        eq(businessEvent.status, "active"),
        gt(businessEvent.createdAt, since),
        lte(businessEvent.createdAt, until),
        or(
          and(isNull(businessEvent.endsAt), gt(businessEvent.startsAt, until)),
          gt(businessEvent.endsAt, until),
        ),
      ),
    )
    .orderBy(asc(businessEvent.createdAt))
    .limit(FOLLOW_SCAN_LIMIT);

  const candidates: FollowCandidate[] = [
    ...updates.flatMap((row) =>
      row.createdAt
        ? [{ ...row, kind: "update" as const, createdAt: row.createdAt }]
        : [],
    ),
    ...offers.map((row) => ({ ...row, kind: "offer" as const })),
    ...events.map((row) => ({ ...row, kind: "event" as const })),
  ];

  const result: FollowedNoticesResult = {
    candidates: candidates.length,
    raised: 0,
  };
  for (const draft of composeFollowNotices(candidates)) {
    const raised = await raiseNotification(draft.userId, {
      kind: draft.kind,
      params: draft.params,
      href: draft.href,
      dedupeKey: draft.dedupeKey,
    });
    if (raised) result.raised += 1;
  }

  // A scan that hit its row limit leaves the cursor where the oldest unread
  // row could still be: stop the cursor at the newest candidate instead.
  const truncated = [updates, offers, events].some(
    (rows) => rows.length >= FOLLOW_SCAN_LIMIT,
  );
  const advanceTo = truncated
    ? new Date(
        Math.min(
          ...[updates, offers, events]
            .filter((rows) => rows.length >= FOLLOW_SCAN_LIMIT)
            .map((rows) =>
              Math.max(
                ...rows.map((row) => (row.createdAt ?? since).getTime()),
              ),
            ),
        ),
      )
    : until;
  await database
    .insert(jobCursor)
    .values({ name: FOLLOW_CURSOR_NAME, cursorAt: advanceTo })
    .onConflictDoUpdate({
      target: jobCursor.name,
      set: { cursorAt: advanceTo, updatedAt: sql`now()` },
    });
  return result;
}
