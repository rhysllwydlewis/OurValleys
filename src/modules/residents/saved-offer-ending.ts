import "server-only";

import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business } from "@/lib/database/schema/business";
import { businessOffer } from "@/lib/database/schema/business-operations";
import { savedOffer } from "@/lib/database/schema/saved-discovery";
import {
  OFFER_ENDING_NOTICE_DAYS,
  offerNeedsEndingNotice,
} from "@/modules/businesses/offer-page-model";
import { raiseNotification } from "./notifications";

const POSTGRES_FOREIGN_KEY_VIOLATION = "23503";
/** Rows read per run; the rest are picked up by the next run. */
const ENDING_SCAN_LIMIT = 500;

export type SavedOfferEndingResult = { scanned: number; raised: number };

/**
 * Tells people, once, that an offer they saved is about to end. Runs on the
 * same schedule as the other in-site notice scans. Only live offers of real
 * published businesses count, and only verified people who are not banned.
 *
 * The save row remembers the end time the notice was raised for, so a run
 * repeated or overlapping with another is harmless, and an offer whose end
 * is later moved is flagged again near the new end. A muted kind raises
 * nothing but is still recorded as handled, so it is never retried.
 */
export async function runSavedOfferEndingNotices(
  now = new Date(),
): Promise<SavedOfferEndingResult> {
  const database = getDatabase();
  // Wide enough to cover the notice window in any time zone; the model
  // makes the final call in British calendar days.
  const horizon = new Date(
    now.getTime() + (OFFER_ENDING_NOTICE_DAYS + 1) * 86_400_000,
  );
  const rows = await database
    .select({
      userId: savedOffer.userId,
      offerId: savedOffer.offerId,
      noticedFor: savedOffer.endingNoticeAt,
      title: businessOffer.title,
      endsAt: businessOffer.endsAt,
      businessName: business.tradingName,
    })
    .from(savedOffer)
    .innerJoin(businessOffer, eq(businessOffer.id, savedOffer.offerId))
    .innerJoin(business, eq(business.id, businessOffer.businessId))
    .innerJoin(user, eq(user.id, savedOffer.userId))
    .where(
      and(
        eq(business.status, "published"),
        eq(business.isDemo, false),
        isNull(business.suspendedAt),
        eq(businessOffer.status, "active"),
        or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, now)),
        gte(businessOffer.endsAt, now),
        lte(businessOffer.endsAt, horizon),
        eq(user.emailVerified, true),
        eq(user.banned, false),
        or(
          isNull(savedOffer.endingNoticeAt),
          sql`${savedOffer.endingNoticeAt} <> ${businessOffer.endsAt}`,
        ),
      ),
    )
    .orderBy(businessOffer.endsAt, savedOffer.userId, savedOffer.offerId)
    .limit(ENDING_SCAN_LIMIT);

  const result: SavedOfferEndingResult = { scanned: rows.length, raised: 0 };
  for (const row of rows) {
    if (!offerNeedsEndingNotice(row.endsAt, row.noticedFor, now)) continue;
    try {
      const raised = await raiseNotification(
        row.userId,
        {
          kind: "saved_offer_ending",
          params: { title: row.title, business: row.businessName },
          href: `/offers/${row.offerId}`,
          dedupeKey: `saved_offer_ending:${row.offerId}:${row.endsAt?.getTime()}`,
        },
        { strict: true },
      );
      if (raised) result.raised += 1;
      await database
        .update(savedOffer)
        .set({ endingNoticeAt: row.endsAt })
        .where(
          and(
            eq(savedOffer.userId, row.userId),
            eq(savedOffer.offerId, row.offerId),
          ),
        );
    } catch (error) {
      const code =
        (error as { code?: string; cause?: { code?: string } })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code;
      // The person was deleted since the scan: nothing to tell them.
      if (code !== POSTGRES_FOREIGN_KEY_VIOLATION) throw error;
    }
  }
  return result;
}
