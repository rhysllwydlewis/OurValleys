import type {
  BusinessLifecycleState,
  LifecycleView,
} from "./lifecycle-automation";
import { londonCalendarDays } from "./offer-studio-model";

/**
 * Plain-language reading of a business's lifecycle for the owner's Listing
 * tab. Pure: the page loads the lifecycle row and the publication status and
 * this decides what to say and which actions to offer. Authorisation is never
 * decided here; the server actions check the permission and the owner role
 * again for every change.
 */

export type ListingHeadline =
  | "live"
  | "not_public"
  | "in_review"
  | "rejected"
  | "suspended"
  | "paused"
  | "temporarily_closed"
  | "permanently_closed"
  | "deletion_pending";

export type ListingTone = "ok" | "info" | "warn" | "danger";

export const headlineTones: Record<ListingHeadline, ListingTone> = {
  live: "ok",
  not_public: "info",
  in_review: "info",
  rejected: "warn",
  suspended: "danger",
  paused: "warn",
  temporarily_closed: "warn",
  permanently_closed: "danger",
  deletion_pending: "danger",
};

/** Publication states in which the business page is (or is waiting to be) public. */
const publicStatuses = ["published"];

/** The statuses the automatic publication job can act on. */
export const autoPublishStatuses = ["draft", "rejected"];

export function listingHeadline(
  state: BusinessLifecycleState,
  publicationStatus: string,
): ListingHeadline {
  if (state !== "active") return state;
  if (publicStatuses.includes(publicationStatus)) return "live";
  if (publicationStatus === "pending_review") return "in_review";
  if (publicationStatus === "rejected") return "rejected";
  if (publicationStatus === "suspended") return "suspended";
  return "not_public";
}

export type TimelineCode =
  "confirmation" | "closure_ends" | "auto_publish" | "deletion";

export type TimelineUrgency = "calm" | "soon" | "overdue";

export type TimelineItem = {
  code: TimelineCode;
  date: Date;
  /** UK calendar days from today; negative when the date has passed. */
  days: number;
  urgency: TimelineUrgency;
};

/** A confirmation within this many days is shown as needing attention. */
export const confirmationSoonDays = 30;
/** A deletion within this many days is shown as needing attention. */
export const deletionSoonDays = 7;

/**
 * What the lifecycle is going to do next, soonest first. Only dates that are
 * actually scheduled appear, and only while they matter: a confirmation date
 * is moot while the page is paused for deletion, an automatic publication
 * only counts while the page is still an unpublished draft.
 */
export function listingTimeline(input: {
  lifecycle: LifecycleView;
  publicationStatus: string;
  now: Date;
}): TimelineItem[] {
  const { lifecycle, publicationStatus, now } = input;
  const items: TimelineItem[] = [];
  const add = (
    code: TimelineCode,
    date: Date | null,
    urgency: (days: number) => TimelineUrgency,
  ) => {
    if (!date || Number.isNaN(date.getTime())) return;
    const days = londonCalendarDays(date, now);
    items.push({ code, date, days, urgency: urgency(days) });
  };

  if (lifecycle.state === "deletion_pending") {
    // A past date means the warning email has not gone out yet, so the page
    // is still recoverable; it is shown as delayed, not as a fixed deadline.
    add("deletion", lifecycle.deleteAfter, (days) =>
      days < 0 ? "overdue" : days <= deletionSoonDays ? "soon" : "calm",
    );
  } else if (lifecycle.state !== "permanently_closed") {
    add("confirmation", lifecycle.nextConfirmationDueAt, (days) =>
      days < 0 ? "overdue" : days <= confirmationSoonDays ? "soon" : "calm",
    );
  }
  if (lifecycle.state === "temporarily_closed") {
    add("closure_ends", lifecycle.temporaryClosedUntil, () => "calm");
  }
  if (
    lifecycle.autoPublishEnabled &&
    lifecycle.state === "active" &&
    autoPublishStatuses.includes(publicationStatus)
  ) {
    const when =
      lifecycle.postponedUntil &&
      lifecycle.autoPublishAt &&
      lifecycle.postponedUntil > lifecycle.autoPublishAt
        ? lifecycle.postponedUntil
        : lifecycle.autoPublishAt;
    add("auto_publish", when, () => "calm");
  }
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export type ListingAction =
  | "confirm"
  | "pause"
  | "resume"
  | "temporary_close"
  | "permanent_close"
  | "request_deletion"
  | "cancel_deletion";

export const listingActions: readonly ListingAction[] = [
  "confirm",
  "pause",
  "resume",
  "temporary_close",
  "permanent_close",
  "request_deletion",
  "cancel_deletion",
];

export function isListingAction(value: unknown): value is ListingAction {
  return (
    typeof value === "string" &&
    (listingActions as readonly string[]).includes(value)
  );
}

/** Actions only the owner may take; the service enforces this again. */
export const ownerOnlyActions: readonly ListingAction[] = [
  "permanent_close",
  "request_deletion",
  "cancel_deletion",
];

/** Actions that need the business name typed back before they run. */
export const nameConfirmedActions: readonly ListingAction[] = [
  "permanent_close",
  "request_deletion",
];

/**
 * Which actions make sense now. `isOwner` and `canLifecycle` only decide what
 * to offer; a hidden button never grants or removes any access.
 */
export function availableActions(input: {
  state: BusinessLifecycleState;
  /** The `business.status`; a closure notice only exists on a published page. */
  publicationStatus: string;
  canLifecycle: boolean;
  isOwner: boolean;
}): ListingAction[] {
  if (!input.canLifecycle) return [];
  const { state } = input;
  const actions: ListingAction[] = [];
  if (
    state === "active" ||
    state === "paused" ||
    state === "temporarily_closed"
  ) {
    actions.push("confirm");
  }
  if (state === "active" || state === "temporarily_closed") {
    actions.push("pause");
  }
  if (
    state === "paused" ||
    state === "temporarily_closed" ||
    state === "permanently_closed"
  ) {
    actions.push("resume");
  }
  // Also offered while closed, so a closure can be extended or shortened.
  if (
    state === "temporarily_closed" ||
    (state === "active" && publicStatuses.includes(input.publicationStatus))
  ) {
    actions.push("temporary_close");
  }
  if (input.isOwner) {
    if (
      state === "active" ||
      state === "paused" ||
      state === "temporarily_closed"
    ) {
      actions.push("permanent_close");
    }
    // Cancelling always returns the page to active, so deletion is only
    // offered from active: a paused or closed page would come back live.
    if (state === "active") actions.push("request_deletion");
    if (state === "deletion_pending") actions.push("cancel_deletion");
  }
  return actions;
}

/** The furthest ahead automatic publication may be postponed (the service allows 90 days). */
export const maxPostponeDays = 89;

/** The longest a temporary closure may run before it should be a pause. */
export const maxClosureDays = 366;

export type ClosureDateResult =
  | { ok: true; until: Date }
  | { ok: false; reason: "required" | "invalid" | "past" | "too_far" };

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function londonWall(value: Date): string {
  const parts: Record<string, string> = {};
  for (const part of londonParts.formatToParts(value)) {
    parts[part.type] = part.value;
  }
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * A closure date typed as a calendar day means "until the end of that day,
 * UK time": the page reopens overnight, not at noon. Returns the moment that
 * is 23:59 on that UK day, correct on the days the clocks change.
 */
export function parseClosureDate(
  raw: string,
  now: Date,
  maxDays: number = maxClosureDays,
): ClosureDateResult {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "required" };
  const match = datePattern.exec(text);
  if (!match) return { ok: false, reason: "invalid" };
  const [year, month, day] = match.slice(1).map(Number) as [
    number,
    number,
    number,
  ];
  const wall = Date.UTC(year, month - 1, day, 23, 59);
  const check = new Date(wall);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return { ok: false, reason: "invalid" };
  }
  const wanted = `${text}T23:59`;
  // 23:59 never falls in a clock change, so one of these two always matches.
  const until = [1, 0]
    .map((offset) => new Date(wall - offset * 3_600_000))
    .find((candidate) => londonWall(candidate) === wanted);
  if (!until) return { ok: false, reason: "invalid" };
  if (until <= now) return { ok: false, reason: "past" };
  if (londonCalendarDays(until, now) > maxDays) {
    return { ok: false, reason: "too_far" };
  }
  return { ok: true, until };
}

/** The `YYYY-MM-DD` of a moment in UK time, for a date input's `min`. */
export function londonDateInput(value: Date): string {
  return londonWall(value).slice(0, 10);
}

/** Collapses case and whitespace so a typed name only has to be recognisable. */
function normaliseName(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-GB");
}

/** True when the typed text is the business's trading name. */
export function nameConfirmationMatches(
  typed: string,
  tradingName: string,
): boolean {
  const wanted = normaliseName(tradingName);
  return wanted.length > 0 && normaliseName(typed) === wanted;
}
