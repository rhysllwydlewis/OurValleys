import "server-only";
import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
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
  FOLLOW_ITEM_MAX_AGE_DAYS,
  FOLLOW_SCAN_LIMIT,
  resolveFollowWindow,
  type FollowCandidate,
  type FollowItemKind,
} from "./following-model";
import { raiseNotification } from "./notifications";

const POSTGRES_FOREIGN_KEY_VIOLATION = "23503";

export type FollowedNoticesResult = {
  items: number;
  candidates: number;
  raised: number;
};

type ScannedItem = {
  kind: FollowItemKind;
  itemId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  title: string;
  startsAt: Date | null;
  /** When the item became visible; the order the scan reads in. */
  at: Date;
};

const publicBusiness = () =>
  and(
    eq(business.status, "published"),
    eq(business.isDemo, false),
    isNull(business.suspendedAt),
  );

/**
 * The items that became visible in the window, oldest first, without their
 * followers: a business with many savers is one row here, so the row limit
 * counts items and never cuts a business's followers off.
 */
async function scanItems(since: Date, until: Date): Promise<ScannedItem[]> {
  const database = getDatabase();
  const oldest = new Date(
    until.getTime() - FOLLOW_ITEM_MAX_AGE_DAYS * 86_400_000,
  );
  const base = {
    businessId: business.id,
    businessName: business.tradingName,
    businessSlug: business.slug,
  };

  const updates = await database
    .select({
      ...base,
      itemId: businessUpdate.id,
      title: businessUpdate.title,
      at: businessUpdate.publishedAt,
    })
    .from(businessUpdate)
    .innerJoin(business, eq(business.id, businessUpdate.businessId))
    .where(
      and(
        publicBusiness(),
        eq(businessUpdate.status, "published"),
        gt(businessUpdate.publishedAt, since),
        lte(businessUpdate.publishedAt, until),
      ),
    )
    .orderBy(asc(businessUpdate.publishedAt), asc(businessUpdate.id))
    .limit(FOLLOW_SCAN_LIMIT);

  // An offer becomes visible when it is last switched on or edited, or when
  // its start date arrives, whichever is later. A draft or paused offer that
  // goes live later is therefore announced then, not missed.
  const offerAt = sql<Date>`greatest(${businessOffer.updatedAt}, coalesce(${businessOffer.startsAt}, ${businessOffer.updatedAt}))`;
  const offers = await database
    .select({
      ...base,
      itemId: businessOffer.id,
      title: businessOffer.title,
      at: offerAt,
    })
    .from(businessOffer)
    .innerJoin(business, eq(business.id, businessOffer.businessId))
    .where(
      and(
        publicBusiness(),
        eq(businessOffer.status, "active"),
        gte(businessOffer.createdAt, oldest),
        sql`${offerAt} > ${since.toISOString()}::timestamptz`,
        sql`${offerAt} <= ${until.toISOString()}::timestamptz`,
        or(isNull(businessOffer.endsAt), gt(businessOffer.endsAt, until)),
      ),
    )
    .orderBy(offerAt, asc(businessOffer.id))
    .limit(FOLLOW_SCAN_LIMIT);

  const events = await database
    .select({
      ...base,
      itemId: businessEvent.id,
      title: businessEvent.title,
      startsAt: businessEvent.startsAt,
      at: businessEvent.updatedAt,
    })
    .from(businessEvent)
    .innerJoin(business, eq(business.id, businessEvent.businessId))
    .where(
      and(
        publicBusiness(),
        eq(businessEvent.status, "active"),
        gte(businessEvent.createdAt, oldest),
        gt(businessEvent.updatedAt, since),
        lte(businessEvent.updatedAt, until),
        or(
          and(isNull(businessEvent.endsAt), gt(businessEvent.startsAt, until)),
          gt(businessEvent.endsAt, until),
        ),
      ),
    )
    .orderBy(asc(businessEvent.updatedAt), asc(businessEvent.id))
    .limit(FOLLOW_SCAN_LIMIT);

  return [
    ...updates.flatMap((row) =>
      row.at
        ? [{ ...row, kind: "update" as const, startsAt: null, at: row.at }]
        : [],
    ),
    ...offers.map((row) => ({
      ...row,
      kind: "offer" as const,
      startsAt: null,
      at: new Date(row.at),
    })),
    ...events.map((row) => ({ ...row, kind: "event" as const })),
  ];
}

/** Savers who may be told: verified, not banned, and have not muted it. */
async function loadFollowers(businessIds: string[]) {
  if (businessIds.length === 0) return new Map<string, string[]>();
  const rows = await getDatabase()
    .select({
      userId: savedBusiness.userId,
      businessId: savedBusiness.businessId,
    })
    .from(savedBusiness)
    .innerJoin(user, eq(user.id, savedBusiness.userId))
    .where(
      and(
        inArray(savedBusiness.businessId, businessIds),
        eq(savedBusiness.notify, true),
        eq(user.emailVerified, true),
        eq(user.banned, false),
      ),
    );
  const byBusiness = new Map<string, string[]>();
  for (const row of rows) {
    const list = byBusiness.get(row.businessId) ?? [];
    list.push(row.userId);
    byBusiness.set(row.businessId, list);
  }
  return byBusiness;
}

/**
 * Raises an in-site notice for every person who saved a business when that
 * business publishes an update or adds or switches on an offer or event.
 *
 * Each run covers the time from the stored cursor to two minutes ago, so a
 * missed run is caught up and a late-committing row is still seen. Notices
 * are de-duplicated by item, so overlap and retries are harmless. A write
 * failure throws before the cursor moves, so the same window is retried;
 * only a person deleted mid-run is skipped. When a scan hits its row limit
 * the cursor stops just before the last item read (the item itself is read
 * again, harmlessly) so the next run continues from there.
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

  const items = await scanItems(since, until);
  const followers = await loadFollowers([
    ...new Set(items.map((item) => item.businessId)),
  ]);

  const candidates: FollowCandidate[] = items.flatMap((item) =>
    (followers.get(item.businessId) ?? []).map((userId) => ({
      userId,
      kind: item.kind,
      itemId: item.itemId,
      businessName: item.businessName,
      businessSlug: item.businessSlug,
      title: item.title,
      startsAt: item.startsAt,
      createdAt: item.at,
    })),
  );

  const result: FollowedNoticesResult = {
    items: items.length,
    candidates: candidates.length,
    raised: 0,
  };
  for (const draft of composeFollowNotices(candidates)) {
    try {
      const raised = await raiseNotification(
        draft.userId,
        {
          kind: draft.kind,
          params: draft.params,
          href: draft.href,
          dedupeKey: draft.dedupeKey,
        },
        { strict: true },
      );
      if (raised) result.raised += 1;
    } catch (error) {
      const code =
        (error as { code?: string; cause?: { code?: string } })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code;
      // The person was deleted since the scan: nothing to tell them.
      if (code !== POSTGRES_FOREIGN_KEY_VIOLATION) throw error;
    }
  }

  // Per kind, a scan that hit its limit tells us where to resume.
  const limited = (["update", "offer", "event"] as const)
    .map((kind) => items.filter((item) => item.kind === kind))
    .filter((rows) => rows.length >= FOLLOW_SCAN_LIMIT)
    .map((rows) => Math.max(...rows.map((row) => row.at.getTime())) - 1);
  const advanceTo = limited.length > 0 ? new Date(Math.min(...limited)) : until;

  await database
    .insert(jobCursor)
    .values({ name: FOLLOW_CURSOR_NAME, cursorAt: advanceTo })
    .onConflictDoUpdate({
      target: jobCursor.name,
      set: {
        // Never backwards: an older overlapping run must not undo a newer one.
        cursorAt: sql`greatest(${jobCursor.cursorAt}, excluded.cursor_at)`,
        updatedAt: sql`now()`,
      },
    });
  return result;
}
