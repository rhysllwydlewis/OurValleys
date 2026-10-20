/**
 * Pure rules for the events studio (`/dashboard/business/[id]/events`): what
 * state an event is in, what to tell the owner about it, how a submitted form
 * is read and checked, and which quick actions make sense. No database or
 * framework code lives here so every rule can be tested directly. Date parsing
 * is shared with the offers studio (typed UK time becomes a moment).
 */
import {
  londonCalendarDays,
  parseLondonInput,
  toLondonInput,
  wholeMinute,
} from "./offer-studio-model";
import {
  eventRepeatFrequencies,
  MAX_EVENT_OCCURRENCES,
  type EventRepeatFrequency,
} from "@/modules/events/recurrence";

export { parseLondonInput, toLondonInput, wholeMinute };

export const eventLimits = {
  titleMin: 2,
  titleMax: 160,
  descriptionMin: 5,
  descriptionMax: 3000,
  locationMax: 300,
  urlMax: 1000,
  /** Events beyond this (all dates of every series) are refused. */
  maxEvents: 500,
  /** Past events listed in the studio; older ones are summarised. */
  pastShown: 20,
} as const;

export const eventStates = [
  "happening",
  "upcoming",
  "draft",
  "hidden",
  "cancelled",
  "past",
] as const;
export type EventState = (typeof eventStates)[number];

export type StudioEvent = {
  id: string;
  title: string;
  description: string;
  locationDisplay: string | null;
  bookingUrl: string | null;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  seriesId: string | null;
  hasImage: boolean;
};

/**
 * When an event stops being listed publicly: its end, or its start when it has
 * no end (the public listing drops an event without an end once it starts).
 */
export function eventListedUntil(event: {
  startsAt: Date;
  endsAt: Date | null;
}): Date {
  return event.endsAt ?? event.startsAt;
}

/**
 * What a visitor would see right now. This mirrors the public rule (active and
 * not yet over) and adds the owner's view of everything else, so "upcoming"
 * and "happening" here always mean "on the public site".
 */
export function eventState(event: StudioEvent, now: Date): EventState {
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "draft") return "draft";
  if (event.status === "hidden") return "hidden";
  if (eventListedUntil(event).getTime() < now.getTime()) return "past";
  if (event.startsAt.getTime() > now.getTime()) return "upcoming";
  // An event with no end is dropped from the public site the moment it starts.
  return event.endsAt ? "happening" : "past";
}

export type EventGuidanceCode =
  | "startsToday"
  | "draftReady"
  | "draftPast"
  | "noPicture"
  | "noLocation"
  | "noBooking"
  | "noEnd"
  | "thinDescription";

export type EventGuidance = {
  code: EventGuidanceCode;
  /** `attention` asks for a decision; `tip` is an improvement. */
  level: "attention" | "tip";
};

/** An event can go live when the public site would not show a blank card. */
export function eventReadiness(
  event: StudioEvent,
  now: Date,
): {
  ready: boolean;
  missing: ("title" | "description" | "future")[];
} {
  const missing: ("title" | "description" | "future")[] = [];
  if (event.title.trim().length < eventLimits.titleMin) missing.push("title");
  if (event.description.trim().length < eventLimits.descriptionMin) {
    missing.push("description");
  }
  if (eventListedUntil(event).getTime() <= now.getTime()) {
    missing.push("future");
  }
  return { ready: missing.length === 0, missing };
}

/**
 * Plain-language nudges, most important first. Only what applies to the
 * state is returned: a finished event needs a way to run again, not tips.
 */
export function eventGuidance(event: StudioEvent, now: Date): EventGuidance[] {
  const state = eventState(event, now);
  const out: EventGuidance[] = [];
  if (state === "past" || state === "cancelled") return out;
  if (
    (state === "upcoming" || state === "happening") &&
    londonCalendarDays(event.startsAt, now) <= 0
  ) {
    out.push({ code: "startsToday", level: "attention" });
  }
  if (state === "draft") {
    if (eventListedUntil(event).getTime() <= now.getTime()) {
      out.push({ code: "draftPast", level: "attention" });
    } else if (eventReadiness(event, now).ready) {
      out.push({ code: "draftReady", level: "attention" });
    }
  }
  if (!event.hasImage) out.push({ code: "noPicture", level: "tip" });
  if (!event.locationDisplay) out.push({ code: "noLocation", level: "tip" });
  if (!event.bookingUrl) out.push({ code: "noBooking", level: "tip" });
  if (!event.endsAt) out.push({ code: "noEnd", level: "tip" });
  if (event.description.trim().length < 60) {
    out.push({ code: "thinDescription", level: "tip" });
  }
  return out;
}

export function groupEvents(
  events: readonly StudioEvent[],
  now: Date,
): Record<EventState, StudioEvent[]> {
  const groups: Record<EventState, StudioEvent[]> = {
    happening: [],
    upcoming: [],
    draft: [],
    hidden: [],
    cancelled: [],
    past: [],
  };
  for (const event of events) groups[eventState(event, now)].push(event);
  const start = (event: StudioEvent) => event.startsAt.getTime();
  groups.happening.sort((a, b) => start(a) - start(b));
  groups.upcoming.sort((a, b) => start(a) - start(b));
  groups.draft.sort((a, b) => start(a) - start(b));
  groups.hidden.sort((a, b) => start(a) - start(b));
  groups.cancelled.sort((a, b) => start(b) - start(a));
  // Most recently finished first, so a recurring event is easy to bring back.
  groups.past.sort((a, b) => start(b) - start(a));
  return groups;
}

export type EventCounts = Record<EventState, number> & { total: number };

export function countEvents(
  events: readonly StudioEvent[],
  now: Date,
): EventCounts {
  const groups = groupEvents(events, now);
  return {
    happening: groups.happening.length,
    upcoming: groups.upcoming.length,
    draft: groups.draft.length,
    hidden: groups.hidden.length,
    cancelled: groups.cancelled.length,
    past: groups.past.length,
    total: events.length,
  };
}

/**
 * How many still-upcoming, owner-managed dates each series has (a draft,
 * published or paused date counts; a cancelled or finished one does not).
 */
export function upcomingSeriesCounts(
  events: readonly StudioEvent[],
  now: Date,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.seriesId) continue;
    if (!["draft", "active", "hidden"].includes(event.status)) continue;
    if (event.startsAt.getTime() < now.getTime()) continue;
    counts.set(event.seriesId, (counts.get(event.seriesId) ?? 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// The form.
// ---------------------------------------------------------------------------

export type EventFieldName =
  | "title"
  | "description"
  | "locationDisplay"
  | "bookingUrl"
  | "startsAt"
  | "endsAt"
  | "repeatOccurrences";

export type EventErrorCode =
  | "titleShort"
  | "titleLong"
  | "descriptionShort"
  | "descriptionLong"
  | "locationLong"
  | "urlInvalid"
  | "startRequired"
  | "dateInvalid"
  | "endBeforeStart"
  | "startInPast"
  | "occurrencesInvalid";

export type EventFormValues = {
  title: string;
  description: string;
  locationDisplay: string;
  bookingUrl: string;
  startsAt: string;
  endsAt: string;
  status: string;
  repeatFrequency: string;
  repeatOccurrences: string;
  applyToSeries: string;
};

export type ParsedEventForm =
  | {
      ok: true;
      event: {
        title: string;
        description: string;
        locationDisplay: string | null;
        bookingUrl: string | null;
        startsAt: string;
        endsAt: string | null;
        status: "draft" | "active" | "hidden" | "cancelled";
        repeat: { frequency: EventRepeatFrequency; occurrences: number } | null;
        applyToSeries: boolean;
      };
    }
  | {
      ok: false;
      errors: Partial<Record<EventFieldName, EventErrorCode>>;
    };

export function readEventValues(
  get: (name: string) => unknown,
): EventFormValues {
  const text = (name: string) => {
    const value = get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    title: text("title"),
    description: text("description"),
    locationDisplay: text("locationDisplay"),
    bookingUrl: text("bookingUrl"),
    startsAt: text("startsAt"),
    endsAt: text("endsAt"),
    status: text("status"),
    repeatFrequency: text("repeatFrequency"),
    repeatOccurrences: text("repeatOccurrences"),
    applyToSeries: text("applyToSeries"),
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Checks a submitted form field by field so the owner is told exactly which
 * box to fix. `isNew` makes a start in the past an error (an event being
 * edited may keep its old date, for example to cancel or tidy it), and only a
 * new event may repeat.
 */
export function parseEventForm(
  values: EventFormValues,
  options: { now: Date; isNew: boolean; goingLive: boolean },
): ParsedEventForm {
  const errors: Partial<Record<EventFieldName, EventErrorCode>> = {};
  const title = values.title.trim();
  const description = values.description.trim();
  const location = values.locationDisplay.trim();
  const bookingUrl = values.bookingUrl.trim();

  if (title.length < eventLimits.titleMin) errors.title = "titleShort";
  else if (title.length > eventLimits.titleMax) errors.title = "titleLong";
  if (description.length < eventLimits.descriptionMin) {
    errors.description = "descriptionShort";
  } else if (description.length > eventLimits.descriptionMax) {
    errors.description = "descriptionLong";
  }
  if (location.length > eventLimits.locationMax) {
    errors.locationDisplay = "locationLong";
  }
  if (bookingUrl) {
    if (bookingUrl.length > eventLimits.urlMax || !isHttpUrl(bookingUrl)) {
      errors.bookingUrl = "urlInvalid";
    }
  }

  const startsAt = parseLondonInput(values.startsAt);
  const endsAt = parseLondonInput(values.endsAt);
  if (startsAt === null) errors.startsAt = "startRequired";
  else if (startsAt === "invalid") errors.startsAt = "dateInvalid";
  if (endsAt === "invalid") errors.endsAt = "dateInvalid";
  if (
    startsAt instanceof Date &&
    endsAt instanceof Date &&
    endsAt.getTime() <= startsAt.getTime()
  ) {
    errors.endsAt = "endBeforeStart";
  }
  if (
    startsAt instanceof Date &&
    !errors.startsAt &&
    (options.isNew || options.goingLive) &&
    (endsAt instanceof Date ? endsAt : startsAt).getTime() <=
      options.now.getTime()
  ) {
    errors.startsAt = "startInPast";
  }

  let repeat: { frequency: EventRepeatFrequency; occurrences: number } | null =
    null;
  if (
    options.isNew &&
    (eventRepeatFrequencies as readonly string[]).includes(
      values.repeatFrequency,
    )
  ) {
    const occurrences = Number(values.repeatOccurrences);
    if (
      !Number.isInteger(occurrences) ||
      occurrences < 2 ||
      occurrences > MAX_EVENT_OCCURRENCES
    ) {
      errors.repeatOccurrences = "occurrencesInvalid";
    } else {
      repeat = {
        frequency: values.repeatFrequency as EventRepeatFrequency,
        occurrences,
      };
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const status = (["active", "hidden", "cancelled"] as const).find(
    (candidate) => candidate === values.status,
  );
  return {
    ok: true,
    event: {
      title,
      description,
      locationDisplay: location || null,
      bookingUrl: bookingUrl || null,
      startsAt: (startsAt as Date).toISOString(),
      endsAt: endsAt instanceof Date ? endsAt.toISOString() : null,
      // A brand-new event cannot start life cancelled.
      status:
        options.isNew && status === "cancelled" ? "draft" : (status ?? "draft"),
      repeat,
      applyToSeries: !options.isNew && values.applyToSeries === "on",
    },
  };
}

// ---------------------------------------------------------------------------
// Quick actions.
// ---------------------------------------------------------------------------

export const quickActions = [
  "publish",
  "pause",
  "resume",
  "cancel",
  "reopen",
  "postpone",
  "duplicate",
] as const;
export type QuickAction = (typeof quickActions)[number];

export function isQuickAction(value: unknown): value is QuickAction {
  return (
    typeof value === "string" &&
    (quickActions as readonly string[]).includes(value)
  );
}

/** Days "postpone" can move an event by. */
export const postponeChoices = [1, 7, 14] as const;

export function isPostponeDays(value: number): boolean {
  return (postponeChoices as readonly number[]).includes(value);
}

/**
 * Which quick actions make sense for an event in each state. The server
 * re-checks with the same rule, so a stale page cannot do something odd.
 */
export function actionsFor(state: EventState): QuickAction[] {
  switch (state) {
    case "happening":
      return ["cancel", "duplicate"];
    case "upcoming":
      return ["postpone", "pause", "cancel", "duplicate"];
    case "draft":
      return ["publish", "duplicate"];
    case "hidden":
      return ["resume", "duplicate"];
    case "cancelled":
      return ["reopen", "duplicate"];
    case "past":
      return ["duplicate"];
  }
}

const inputPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * The same UK wall-clock time `days` calendar days later (so 19:00 stays
 * 19:00 across a clock change), whole minutes like every date the form shows.
 */
export function shiftLondonDays(value: Date, days: number): Date | null {
  const match = inputPattern.exec(toLondonInput(value));
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const later = new Date(Date.UTC(year, month - 1, day + days, hour, minute));
  const p = (n: number, width = 2) => String(n).padStart(width, "0");
  const parsed = parseLondonInput(
    `${p(later.getUTCFullYear(), 4)}-${p(later.getUTCMonth() + 1)}-${p(later.getUTCDate())}T${p(later.getUTCHours())}:${p(later.getUTCMinutes())}`,
  );
  return parsed instanceof Date ? parsed : null;
}

/**
 * Dates for a copy of an event: the same time of day and length, moved a week
 * at a time until it is in the future, so a copy of last month's quiz lands
 * on the next free quiz night rather than in the past.
 */
export function copyDates(
  event: { startsAt: Date; endsAt: Date | null },
  now: Date,
): { startsAt: Date; endsAt: Date | null } {
  const length = event.endsAt
    ? event.endsAt.getTime() - event.startsAt.getTime()
    : null;
  let start = event.startsAt;
  for (
    let weeks = 0;
    weeks < 600 && start.getTime() <= now.getTime();
    weeks++
  ) {
    const next = shiftLondonDays(start, 7);
    if (!next) break;
    start = next;
  }
  return {
    startsAt: start,
    endsAt: length === null ? null : new Date(start.getTime() + length),
  };
}

/** A copy's title, kept within the title limit. */
export function duplicateTitle(title: string, suffix: string): string {
  const trimmed = title.trim();
  const next = `${trimmed} ${suffix}`.trim();
  if (next.length <= eventLimits.titleMax) return next;
  const room = eventLimits.titleMax - suffix.length - 2;
  return `${trimmed.slice(0, Math.max(room, 0))}… ${suffix}`;
}

// ---------------------------------------------------------------------------
// What the editor form hands back after a refused save.
// ---------------------------------------------------------------------------

export type EventFormError =
  | "forbidden"
  | "stale"
  | "limit"
  | "invalid"
  | "locked"
  | "not_found"
  | "image-invalid"
  | "image-limit"
  | "image-storage"
  | "unavailable";

export type EventFormState = {
  status: "idle" | "error";
  errors: Partial<Record<EventFieldName, EventErrorCode>>;
  formError: EventFormError | null;
  /** What was typed, so a refusal never loses the owner's work. */
  values: Partial<EventFormValues>;
  attempt: number;
};

export const initialEventFormState: EventFormState = {
  status: "idle",
  errors: {},
  formError: null,
  values: {},
  attempt: 0,
};
