/**
 * Rules for following a saved business: which new things raise a notice, how
 * far back one scan may look, and how a notice is described. Pure, so the
 * limits are tested without a database. See docs/72-following.md.
 */

export const FOLLOW_ITEM_KINDS = ["update", "offer", "event"] as const;
export type FollowItemKind = (typeof FOLLOW_ITEM_KINDS)[number];

export const FOLLOWED_NOTIFICATION_KIND = {
  update: "followed_update",
  offer: "followed_offer",
  event: "followed_event",
} as const;

export const FOLLOW_CURSOR_NAME = "followed-notices";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** A first run, or one after a long outage, looks back this far at most. */
export const FOLLOW_MAX_LOOKBACK_HOURS = 24;
export const FOLLOW_FIRST_RUN_LOOKBACK_HOURS = 1;
/**
 * A run stops this far short of now, so a row whose transaction started
 * before the run but committed just after it is still seen by the next one.
 * The overlap is harmless because notices are de-duplicated.
 */
export const FOLLOW_CLOCK_MARGIN_MINUTES = 2;
/** Offers and events older than this are never announced, however edited. */
export const FOLLOW_ITEM_MAX_AGE_DAYS = 14;
/** One run never raises more than this many notices for one person; any
 * beyond it are skipped (the newest are kept), not carried to the next run. */
export const FOLLOW_MAX_NOTICES_PER_RUN = 12;
/** Rows read per kind per run; the rest are picked up by the next run. */
export const FOLLOW_SCAN_LIMIT = 500;

/** How many items the following page shows, and how far back it looks. */
export const FOLLOW_FEED_LIMIT = 30;
export const FOLLOW_FEED_DAYS = 45;

export type FollowWindow = { since: Date; until: Date };

/**
 * The slice of time one run covers: from where the last run stopped to now,
 * never more than the look-back, and an hour on the very first run so
 * switching the job on does not announce old posts.
 */
export function resolveFollowWindow(
  cursor: Date | null,
  clock: Date,
): FollowWindow {
  const now = new Date(
    clock.getTime() - FOLLOW_CLOCK_MARGIN_MINUTES * MINUTE_MS,
  );
  const earliest = new Date(
    now.getTime() - FOLLOW_MAX_LOOKBACK_HOURS * HOUR_MS,
  );
  if (!cursor) {
    return {
      since: new Date(
        now.getTime() - FOLLOW_FIRST_RUN_LOOKBACK_HOURS * HOUR_MS,
      ),
      until: now,
    };
  }
  const since = cursor > earliest ? cursor : earliest;
  return { since: since < now ? since : now, until: now };
}

export type FollowCandidate = {
  userId: string;
  kind: FollowItemKind;
  itemId: string;
  businessName: string;
  businessSlug: string;
  title: string;
  startsAt?: Date | null;
  createdAt: Date;
};

export type FollowNoticeDraft = {
  userId: string;
  kind: (typeof FOLLOWED_NOTIFICATION_KIND)[FollowItemKind];
  params: Record<string, string | number>;
  href: string;
  dedupeKey: string;
};

export function followDedupeKey(kind: FollowItemKind, itemId: string): string {
  return `follow:${kind}:${itemId}`;
}

/** Where a notice opens: the business page section that holds the item. */
export function followHref(candidate: {
  kind: FollowItemKind;
  itemId: string;
  businessSlug: string;
}): string {
  const slug = encodeURIComponent(candidate.businessSlug);
  switch (candidate.kind) {
    case "update":
      return `/b/${slug}/updates?update=${encodeURIComponent(candidate.itemId)}`;
    case "event":
      return `/events/${encodeURIComponent(candidate.itemId)}`;
    case "offer":
      return `/b/${slug}#offers`;
  }
}

/**
 * Turns scan results into notices: oldest first so the newest survive the
 * per-person cap, and at most FOLLOW_MAX_NOTICES_PER_RUN for anyone.
 */
export function composeFollowNotices(
  candidates: readonly FollowCandidate[],
): FollowNoticeDraft[] {
  const perUser = new Map<string, number>();
  const newestFirst = [...candidates].sort(
    (a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime() ||
      a.itemId.localeCompare(b.itemId),
  );
  const drafts: FollowNoticeDraft[] = [];
  for (const candidate of newestFirst) {
    const used = perUser.get(candidate.userId) ?? 0;
    if (used >= FOLLOW_MAX_NOTICES_PER_RUN) continue;
    perUser.set(candidate.userId, used + 1);
    const params: Record<string, string | number> = {
      business: candidate.businessName,
      title: candidate.title,
    };
    if (candidate.startsAt) params.startsAt = candidate.startsAt.toISOString();
    drafts.push({
      userId: candidate.userId,
      kind: FOLLOWED_NOTIFICATION_KIND[candidate.kind],
      params,
      href: followHref(candidate),
      dedupeKey: followDedupeKey(candidate.kind, candidate.itemId),
    });
  }
  return drafts.reverse();
}
