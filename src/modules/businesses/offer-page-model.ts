import {
  OFFER_WEEK_DAYS,
  offerCalendarDays,
  offerUrgency,
  type OfferUrgency,
} from "./offer-filters";

/** An ended offer's page stays reachable this long so shared links still explain themselves. */
export const OFFER_ENDED_VISIBLE_DAYS = 60;

/** A saved offer is flagged once, this many days (or fewer) before it ends. */
export const OFFER_ENDING_NOTICE_DAYS = 2;

export type OfferTimeline =
  | { kind: "ended" }
  | { kind: "open" }
  | { kind: "today"; urgency: OfferUrgency }
  | { kind: "tomorrow"; urgency: OfferUrgency }
  | { kind: "days"; days: number; urgency: OfferUrgency };

/**
 * Where an offer is on its calendar, in British days: ended, no end date,
 * ending today, tomorrow, or in N days. Drives the badge and the wording.
 */
export function describeOfferTimeline(
  endsAt: Date | null,
  now: Date,
): OfferTimeline {
  if (!endsAt) return { kind: "open" };
  if (endsAt < now) return { kind: "ended" };
  const days = offerCalendarDays(endsAt, now) ?? 0;
  const urgency = offerUrgency(days);
  if (days === 0) return { kind: "today", urgency };
  if (days === 1) return { kind: "tomorrow", urgency };
  return { kind: "days", days, urgency };
}

/** Whether the offer should be flagged as ending soon on its page. */
export function isEndingSoon(timeline: OfferTimeline): boolean {
  return (
    timeline.kind === "today" ||
    timeline.kind === "tomorrow" ||
    (timeline.kind === "days" && timeline.days <= OFFER_WEEK_DAYS)
  );
}

/**
 * The only addresses an offer button may open: plain web links. Anything
 * else (script, data, mail, relative or malformed) shows no button.
 */
export function safeOfferActionUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/**
 * A saved offer is due its "ends soon" notice when it ends within the notice
 * window, has not ended, and has not been flagged for this same end time.
 * Moving the end later makes it due again near the new end.
 */
export function offerNeedsEndingNotice(
  endsAt: Date | null,
  noticedFor: Date | null,
  now: Date,
): boolean {
  if (!endsAt || endsAt < now) return false;
  if (noticedFor && noticedFor.getTime() === endsAt.getTime()) return false;
  const days = offerCalendarDays(endsAt, now) ?? Infinity;
  return days <= OFFER_ENDING_NOTICE_DAYS;
}
