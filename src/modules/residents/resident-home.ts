import { londonDayKey, londonDayKeyAfter } from "@/modules/events/date-window";

/**
 * The pure model behind a resident's "My valleys" home: how saved events are
 * grouped by when they happen, how offers read as "ending soon", which saved
 * tab is showing, and which gentle next steps to suggest. No data access.
 */

export const RESIDENT_COMING_UP_DAYS = 30;

export type ComingUpSource = "saved" | "business" | "place";

export type ComingUpEvent = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  locationDisplay: string | null;
  businessName: string;
  businessSlug: string;
  /** Why this event is here: saved directly, or from a saved business or place. */
  source: ComingUpSource;
};

export type ComingUpBucketKey = "today" | "thisWeek" | "later";

export type ComingUpBucket = {
  key: ComingUpBucketKey;
  events: ComingUpEvent[];
};

const SOURCE_RANK: Record<ComingUpSource, number> = {
  saved: 0,
  business: 1,
  place: 2,
};

/**
 * Merge event lists, keeping each event once under its strongest reason
 * (saved beats a saved business, which beats a saved place), soonest first.
 */
export function mergeComingUp(lists: ComingUpEvent[][]): ComingUpEvent[] {
  const byId = new Map<string, ComingUpEvent>();
  for (const event of lists.flat()) {
    const existing = byId.get(event.id);
    if (!existing || SOURCE_RANK[event.source] < SOURCE_RANK[existing.source]) {
      byId.set(event.id, event);
    }
  }
  return [...byId.values()].sort(
    (a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime() ||
      a.title.localeCompare(b.title, "en-GB"),
  );
}

/**
 * Group events as Today, the rest of the next seven London days, and later.
 * An event already under way today counts as today. Empty groups are dropped.
 */
export function groupComingUp(
  events: ComingUpEvent[],
  now: Date,
): ComingUpBucket[] {
  const today = londonDayKey(now);
  const weekEnd = londonDayKeyAfter(now, 7);
  const buckets: Record<ComingUpBucketKey, ComingUpEvent[]> = {
    today: [],
    thisWeek: [],
    later: [],
  };
  for (const event of events) {
    const day = londonDayKey(event.startsAt);
    const underway = event.startsAt <= now;
    if (underway || day === today) buckets.today.push(event);
    else if (day < weekEnd) buckets.thisWeek.push(event);
    else buckets.later.push(event);
  }
  return (["today", "thisWeek", "later"] as const)
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, events: buckets[key] }));
}

export type OfferEnding =
  { kind: "none" } | { kind: "today" } | { kind: "days"; days: number };

/** "Ends today" / "ends in N days" for the next seven London days, else nothing. */
export function describeOfferEnding(
  endsAt: Date | null,
  now: Date,
): OfferEnding {
  if (!endsAt || endsAt < now) return { kind: "none" };
  const today = londonDayKey(now);
  const endDay = londonDayKey(endsAt);
  if (endDay === today) return { kind: "today" };
  for (let days = 1; days <= 7; days += 1) {
    if (londonDayKeyAfter(now, days) === endDay) return { kind: "days", days };
  }
  return { kind: "none" };
}

export const SAVED_TABS = ["all", "businesses", "events", "places"] as const;
export type SavedTab = (typeof SAVED_TABS)[number];

export function parseSavedTab(value: string | string[] | undefined): SavedTab {
  const single = Array.isArray(value) ? value[0] : value;
  return (SAVED_TABS as readonly string[]).includes(single ?? "")
    ? (single as SavedTab)
    : "all";
}

export function savedTabHref(tab: SavedTab): string {
  return tab === "all" ? "/account/saved" : `/account/saved?tab=${tab}`;
}

export type SavedCounts = {
  businesses: number;
  events: number;
  places: number;
};

export function savedTabCount(counts: SavedCounts, tab: SavedTab): number {
  if (tab === "businesses") return counts.businesses;
  if (tab === "events") return counts.events;
  if (tab === "places") return counts.places;
  return counts.businesses + counts.events + counts.places;
}

export type ResidentStepKey =
  | "saveFirst"
  | "savePlace"
  | "turnOnDigest"
  | "turnOnReminders"
  | "createBusiness";

export type ResidentStep = {
  key: ResidentStepKey;
  href: string;
};

/**
 * At most three suggestions, most useful first, none that the resident has
 * already done. Everything is optional: public browsing never needs an account.
 */
export function residentNextSteps(input: {
  counts: SavedCounts;
  digestOn: boolean;
  remindersOn: boolean;
  ownsBusiness: boolean;
  isDemo: boolean;
}): ResidentStep[] {
  const steps: ResidentStep[] = [];
  const { counts } = input;
  const total = counts.businesses + counts.events + counts.places;
  if (total === 0) steps.push({ key: "saveFirst", href: "/businesses" });
  if (counts.places === 0 && total > 0) {
    steps.push({ key: "savePlace", href: "/places" });
  }
  if (!input.isDemo) {
    if (!input.digestOn && (counts.places > 0 || counts.businesses > 0)) {
      steps.push({
        key: "turnOnDigest",
        href: "/account/settings#preferences",
      });
    }
    if (!input.remindersOn && counts.events > 0) {
      steps.push({
        key: "turnOnReminders",
        href: "/account/settings#preferences",
      });
    }
    if (!input.ownsBusiness) {
      steps.push({ key: "createBusiness", href: "/account/new-business" });
    }
  }
  return steps.slice(0, 3);
}
