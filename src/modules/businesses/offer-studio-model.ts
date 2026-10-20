/**
 * Pure rules for the offers studio (`/dashboard/business/[id]/offers`): what
 * state an offer is in, what to tell the owner about it, how a typed date in
 * the form becomes a moment in time, and how a submitted form is read and
 * checked. No database or framework code lives here so every rule can be
 * tested directly.
 */

export const offerLimits = {
  titleMin: 2,
  titleMax: 120,
  descriptionMin: 5,
  descriptionMax: 1000,
  termsMax: 1000,
  labelMax: 50,
  urlMax: 1000,
  /** Offers beyond this are refused so the studio list stays usable. */
  maxOffers: 100,
} as const;

export const offerStates = [
  "live",
  "scheduled",
  "draft",
  "paused",
  "ended",
] as const;
export type OfferState = (typeof offerStates)[number];

export type StudioOffer = {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: string;
  hasImage: boolean;
};

/**
 * What a visitor would see right now. This mirrors the public listing rule
 * (active, started or no start, not yet ended or no end) and adds the owner's
 * view of everything else, so "live" here always means "on the public site".
 */
export function offerState(offer: StudioOffer, now: Date): OfferState {
  if (offer.status === "draft") return "draft";
  if (offer.status === "hidden") return "paused";
  if (offer.endsAt && offer.endsAt.getTime() < now.getTime()) return "ended";
  if (offer.startsAt && offer.startsAt.getTime() > now.getTime()) {
    return "scheduled";
  }
  return "live";
}

const dayMs = 86_400_000;

/** Whole days until the offer ends, rounded up; null when it has no end. */
export function daysUntilEnd(offer: StudioOffer, now: Date): number | null {
  if (!offer.endsAt) return null;
  return Math.ceil((offer.endsAt.getTime() - now.getTime()) / dayMs);
}

/** Whole days until a scheduled offer starts, rounded up. */
export function daysUntilStart(offer: StudioOffer, now: Date): number | null {
  if (!offer.startsAt) return null;
  return Math.ceil((offer.startsAt.getTime() - now.getTime()) / dayMs);
}

export const endingSoonDays = 7;

export type OfferGuidanceCode =
  | "endsSoon"
  | "endsToday"
  | "noEnd"
  | "noPicture"
  | "noLink"
  | "thinDescription"
  | "draftReady";

export type OfferGuidance = {
  code: OfferGuidanceCode;
  /** `attention` asks for a decision; `tip` is an improvement. */
  level: "attention" | "tip";
};

/**
 * Plain-language nudges, most important first. Only what applies to the
 * offer's state is returned: an ended offer needs a way back, not a tip about
 * its picture.
 */
export function offerGuidance(offer: StudioOffer, now: Date): OfferGuidance[] {
  const state = offerState(offer, now);
  const out: OfferGuidance[] = [];
  if (state === "ended") return out;
  if (state === "live") {
    const left = daysUntilEnd(offer, now);
    if (left !== null && left <= 1) {
      out.push({ code: "endsToday", level: "attention" });
    } else if (left !== null && left <= endingSoonDays) {
      out.push({ code: "endsSoon", level: "attention" });
    } else if (left === null) {
      out.push({ code: "noEnd", level: "tip" });
    }
  }
  if (state === "draft" && offerReadiness(offer).ready) {
    out.push({ code: "draftReady", level: "attention" });
  }
  if (!offer.hasImage) out.push({ code: "noPicture", level: "tip" });
  if (!offer.actionUrl) out.push({ code: "noLink", level: "tip" });
  if (offer.description.trim().length < 40) {
    out.push({ code: "thinDescription", level: "tip" });
  }
  return out;
}

/** An offer can go live when the public site would not show a blank card. */
export function offerReadiness(offer: StudioOffer): {
  ready: boolean;
  missing: ("title" | "description")[];
} {
  const missing: ("title" | "description")[] = [];
  if (offer.title.trim().length < offerLimits.titleMin) missing.push("title");
  if (offer.description.trim().length < offerLimits.descriptionMin) {
    missing.push("description");
  }
  return { ready: missing.length === 0, missing };
}

export function groupOffers(
  offers: readonly StudioOffer[],
  now: Date,
): Record<OfferState, StudioOffer[]> {
  const groups: Record<OfferState, StudioOffer[]> = {
    live: [],
    scheduled: [],
    draft: [],
    paused: [],
    ended: [],
  };
  for (const offer of offers) groups[offerState(offer, now)].push(offer);
  const endsAt = (offer: StudioOffer) =>
    offer.endsAt ? offer.endsAt.getTime() : Number.POSITIVE_INFINITY;
  const startsAt = (offer: StudioOffer) =>
    offer.startsAt ? offer.startsAt.getTime() : 0;
  // Live offers by earliest end, so the one needing a decision comes first.
  groups.live.sort((a, b) => endsAt(a) - endsAt(b));
  groups.scheduled.sort((a, b) => startsAt(a) - startsAt(b));
  // Most recently finished first, so a seasonal offer is easy to bring back.
  groups.ended.sort((a, b) => endsAt(b) - endsAt(a));
  return groups;
}

export type OfferCounts = Record<OfferState, number> & { total: number };

export function countOffers(
  offers: readonly StudioOffer[],
  now: Date,
): OfferCounts {
  const groups = groupOffers(offers, now);
  return {
    live: groups.live.length,
    scheduled: groups.scheduled.length,
    draft: groups.draft.length,
    paused: groups.paused.length,
    ended: groups.ended.length,
    total: offers.length,
  };
}

// ---------------------------------------------------------------------------
// Dates. A `datetime-local` field has no time zone; owners mean UK time.
// ---------------------------------------------------------------------------

const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The `YYYY-MM-DDTHH:mm` an input shows for a moment, in UK time. */
export function toLondonInput(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  const parts: Record<string, string> = {};
  for (const part of londonParts.formatToParts(value)) {
    parts[part.type] = part.value;
  }
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const inputPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Reads a typed UK date and time as the moment it means. Returns `null` for a
 * blank field and `"invalid"` for anything that is not a real date and time
 * (including 30 February). A time that happens twice when the clocks go back
 * means the first; a time that does not exist when they go forward means the
 * same wall-clock time an hour later.
 */
export function parseLondonInput(raw: string): Date | null | "invalid" {
  const text = raw.trim();
  if (!text) return null;
  const match = inputPattern.exec(text);
  if (!match) return "invalid";
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(wall);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    return "invalid";
  }
  // Summer time (UTC+1) first so a repeated autumn hour resolves to the first.
  for (const offsetHours of [1, 0]) {
    const candidate = new Date(wall - offsetHours * 3_600_000);
    if (toLondonInput(candidate) === text) return candidate;
  }
  // The skipped spring hour: the same digits read as UTC land an hour later.
  return check;
}

// ---------------------------------------------------------------------------
// The form.
// ---------------------------------------------------------------------------

export type OfferFieldName =
  | "title"
  | "description"
  | "terms"
  | "actionUrl"
  | "actionLabel"
  | "startsAt"
  | "endsAt";

export type OfferErrorCode =
  | "titleShort"
  | "titleLong"
  | "descriptionShort"
  | "descriptionLong"
  | "termsLong"
  | "urlInvalid"
  | "labelLong"
  | "dateInvalid"
  | "endBeforeStart"
  | "endInPast";

export type OfferFormValues = {
  title: string;
  description: string;
  terms: string;
  actionUrl: string;
  actionLabel: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type ParsedOfferForm =
  | {
      ok: true;
      offer: {
        title: string;
        description: string;
        terms: string | null;
        actionUrl: string | null;
        actionLabel: string | null;
        startsAt: string | null;
        endsAt: string | null;
        status: "draft" | "active" | "hidden";
      };
    }
  | {
      ok: false;
      errors: Partial<Record<OfferFieldName, OfferErrorCode>>;
    };

export function readOfferValues(
  get: (name: string) => unknown,
): OfferFormValues {
  const text = (name: string) => {
    const value = get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    title: text("title"),
    description: text("description"),
    terms: text("terms"),
    actionUrl: text("actionUrl"),
    actionLabel: text("actionLabel"),
    startsAt: text("startsAt"),
    endsAt: text("endsAt"),
    status: text("status"),
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
 * box to fix, rather than a single "invalid". `now` lets a new offer refuse an
 * end date that has already passed (an edited offer may keep its old end).
 */
export function parseOfferForm(
  values: OfferFormValues,
  options: { now: Date; allowPastEnd: boolean },
): ParsedOfferForm {
  const errors: Partial<Record<OfferFieldName, OfferErrorCode>> = {};
  const title = values.title.trim();
  const description = values.description.trim();
  const terms = values.terms.trim();
  const actionUrl = values.actionUrl.trim();
  const actionLabel = values.actionLabel.trim();

  if (title.length < offerLimits.titleMin) errors.title = "titleShort";
  else if (title.length > offerLimits.titleMax) errors.title = "titleLong";
  if (description.length < offerLimits.descriptionMin) {
    errors.description = "descriptionShort";
  } else if (description.length > offerLimits.descriptionMax) {
    errors.description = "descriptionLong";
  }
  if (terms.length > offerLimits.termsMax) errors.terms = "termsLong";
  if (actionUrl) {
    if (actionUrl.length > offerLimits.urlMax || !isHttpUrl(actionUrl)) {
      errors.actionUrl = "urlInvalid";
    }
  }
  if (actionLabel.length > offerLimits.labelMax) {
    errors.actionLabel = "labelLong";
  }

  const startsAt = parseLondonInput(values.startsAt);
  const endsAt = parseLondonInput(values.endsAt);
  if (startsAt === "invalid") errors.startsAt = "dateInvalid";
  if (endsAt === "invalid") errors.endsAt = "dateInvalid";
  if (
    startsAt instanceof Date &&
    endsAt instanceof Date &&
    endsAt.getTime() <= startsAt.getTime()
  ) {
    errors.endsAt = "endBeforeStart";
  }
  if (
    endsAt instanceof Date &&
    !errors.endsAt &&
    !options.allowPastEnd &&
    endsAt.getTime() <= options.now.getTime()
  ) {
    errors.endsAt = "endInPast";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const status =
    values.status === "active" || values.status === "hidden"
      ? values.status
      : "draft";
  return {
    ok: true,
    offer: {
      title,
      description,
      terms: terms || null,
      actionUrl: actionUrl || null,
      // A label only makes sense with a link to point at.
      actionLabel: actionUrl ? actionLabel || null : null,
      startsAt: startsAt instanceof Date ? startsAt.toISOString() : null,
      endsAt: endsAt instanceof Date ? endsAt.toISOString() : null,
      status,
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
  "endNow",
  "extend",
  "duplicate",
] as const;
export type QuickAction = (typeof quickActions)[number];

export function isQuickAction(value: unknown): value is QuickAction {
  return (
    typeof value === "string" &&
    (quickActions as readonly string[]).includes(value)
  );
}

export const extensionChoices = [7, 14, 30] as const;

export function isExtensionDays(value: number): boolean {
  return (extensionChoices as readonly number[]).includes(value);
}

/**
 * Which quick actions make sense for an offer in each state. The server
 * re-checks with the same rule, so a stale page cannot do something odd.
 */
export function actionsFor(state: OfferState): QuickAction[] {
  switch (state) {
    case "live":
      return ["extend", "pause", "endNow", "duplicate"];
    case "scheduled":
      return ["pause", "duplicate"];
    case "draft":
      return ["publish", "duplicate"];
    case "paused":
      return ["resume", "duplicate"];
    case "ended":
      return ["duplicate"];
  }
}

/**
 * The new end date for "extend": from the current end when it is still in the
 * future, otherwise from now. An offer with no end has nothing to extend.
 */
export function extendedEnd(
  current: Date | null,
  days: number,
  now: Date,
): Date | null {
  if (!current || !isExtensionDays(days)) return null;
  const base = Math.max(current.getTime(), now.getTime());
  return new Date(base + days * dayMs);
}

/** A copy's title, kept within the title limit. */
export function duplicateTitle(title: string, suffix: string): string {
  const trimmed = title.trim();
  const next = `${trimmed} ${suffix}`.trim();
  if (next.length <= offerLimits.titleMax) return next;
  const room = offerLimits.titleMax - suffix.length - 2;
  return `${trimmed.slice(0, Math.max(room, 0))}… ${suffix}`;
}

// ---------------------------------------------------------------------------
// What the editor form hands back after a refused save.
// ---------------------------------------------------------------------------

export type OfferFormError =
  | "forbidden"
  | "stale"
  | "limit"
  | "invalid"
  | "not_found"
  | "image-invalid"
  | "image-limit"
  | "image-storage"
  | "unavailable";

export type OfferFormState = {
  status: "idle" | "error";
  errors: Partial<Record<OfferFieldName, OfferErrorCode>>;
  formError: OfferFormError | null;
  /** What was typed, so a refusal never loses the owner's work. */
  values: Partial<OfferFormValues>;
  attempt: number;
};

export const initialOfferFormState: OfferFormState = {
  status: "idle",
  errors: {},
  formError: null,
  values: {},
  attempt: 0,
};
