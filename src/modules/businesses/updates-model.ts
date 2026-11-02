/**
 * Business updates: short plain-text news a business posts to its website and
 * the local updates feed. Everything here is pure so the rules (limits, form
 * checks, Welsh pairing, readiness guidance) are tested without a database.
 * See docs/69-business-updates.md.
 */

import type { ContentImageView } from "./content-images";
import { parseLondonInput } from "./offer-studio-model";

export const updateLimits = {
  titleMin: 3,
  titleMax: 120,
  bodyMin: 10,
  bodyMax: 1500,
  /** Stored updates per business, drafts included. */
  maxUpdates: 200,
  /** Updates a business may publish in any rolling 24 hours. */
  publishesPerDay: 10,
  /** Shown on the business website before "all updates". */
  siteLatest: 3,
  /** An update older than this is no longer called "recent". */
  staleDays: 180,
  /** Updates waiting for their go-live time, per business. */
  maxScheduled: 20,
  /** A scheduled time must be at least this far ahead (the worker runs every few minutes). */
  scheduleMinMinutes: 10,
  /** ...and no further ahead than this. */
  scheduleMaxDays: 90,
} as const;

/** The earliest and latest moments an update may be scheduled for. */
export function scheduleBounds(now: Date): { earliest: Date; latest: Date } {
  return {
    earliest: new Date(
      now.getTime() + updateLimits.scheduleMinMinutes * 60_000,
    ),
    latest: new Date(now.getTime() + updateLimits.scheduleMaxDays * 86_400_000),
  };
}

/**
 * `scheduled` waits for its go-live time and is not public yet. `removed` is an
 * administrator takedown after a report; the owner cannot change it.
 */
export type UpdateStatus = "draft" | "scheduled" | "published" | "removed";

export type StudioUpdate = {
  id: string;
  title: string;
  body: string;
  titleCy: string | null;
  bodyCy: string | null;
  status: UpdateStatus;
  publishedAt: Date | null;
  /** When a scheduled update goes live; null in any other state. */
  scheduledFor: Date | null;
  /** The optional picture. */
  image: ContentImageView | null;
  /** Sent back with an edit so a stale form is noticed rather than saved over. */
  updatedAt: Date;
};

/**
 * Tidies typed text without changing its meaning: Windows line endings
 * become newlines, control characters (other than newline) are dropped,
 * trailing spaces on a line are removed and three or more blank lines
 * become one blank line.
 */
export function cleanUpdateText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(
      /[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g,
      "",
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The paragraphs of an update body; each becomes one `<p>`. */
export function bodyParagraphs(body: string): string[] {
  return cleanUpdateText(body)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** A one-line summary for cards and lists: the first paragraph, shortened. */
export function updateExcerpt(body: string, maxLength = 160): string {
  const first = bodyParagraphs(body)[0] ?? "";
  const flat = first.replace(/\s*\n\s*/g, " ");
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > maxLength * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** A Welsh version counts only when both its fields are written. */
export function hasWelshVersion(update: {
  titleCy: string | null;
  bodyCy: string | null;
}): boolean {
  return Boolean(update.titleCy?.trim() && update.bodyCy?.trim());
}

export function isRecentUpdate(publishedAt: Date | null, now: Date): boolean {
  if (!publishedAt) return false;
  const age = now.getTime() - publishedAt.getTime();
  return age <= updateLimits.staleDays * 86_400_000;
}

// ---------------------------------------------------------------------------
// Guidance.
// ---------------------------------------------------------------------------

export type UpdateGuidanceCode =
  "welshMissing" | "welshHalf" | "shortBody" | "draftReady";

export type UpdateGuidance = { code: UpdateGuidanceCode };

/** Plain-language nudges for one update; none for a good, complete one. */
export function updateGuidance(update: StudioUpdate): UpdateGuidance[] {
  const guidance: UpdateGuidance[] = [];
  const welshTitle = Boolean(update.titleCy?.trim());
  const welshBody = Boolean(update.bodyCy?.trim());
  if (welshTitle !== welshBody) guidance.push({ code: "welshHalf" });
  else if (!welshTitle && update.status === "published") {
    guidance.push({ code: "welshMissing" });
  }
  if (update.body.trim().length < 80) guidance.push({ code: "shortBody" });
  if (
    update.status === "draft" &&
    update.title.trim().length >= updateLimits.titleMin &&
    update.body.trim().length >= updateLimits.bodyMin
  ) {
    guidance.push({ code: "draftReady" });
  }
  return guidance;
}

export type UpdateGroups = {
  /** Waiting for their go-live time, soonest first. */
  scheduled: StudioUpdate[];
  published: StudioUpdate[];
  drafts: StudioUpdate[];
  /** Taken down by an administrator after a report; read-only for the owner. */
  removed: StudioUpdate[];
};

/** Published newest first; drafts most recently edited first. */
export function groupUpdates(updates: StudioUpdate[]): UpdateGroups {
  const published = updates
    .filter((update) => update.status === "published")
    .sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    );
  const scheduled = updates
    .filter((update) => update.status === "scheduled")
    .sort(
      (a, b) =>
        (a.scheduledFor?.getTime() ?? 0) - (b.scheduledFor?.getTime() ?? 0),
    );
  const drafts = updates
    .filter((update) => update.status === "draft")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const removed = updates
    .filter((update) => update.status === "removed")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return { scheduled, published, drafts, removed };
}

// ---------------------------------------------------------------------------
// Form.
// ---------------------------------------------------------------------------

export type UpdateFieldName =
  "title" | "body" | "titleCy" | "bodyCy" | "publishAt";

export type UpdateErrorCode =
  | "titleShort"
  | "titleLong"
  | "bodyShort"
  | "bodyLong"
  | "welshTitleMissing"
  | "welshBodyMissing"
  | "welshTitleLong"
  | "welshBodyLong"
  | "publishAtMissing"
  | "publishAtInvalid"
  | "publishAtSoon"
  | "publishAtFar";

export type UpdateFormValues = {
  title: string;
  body: string;
  titleCy: string;
  bodyCy: string;
  /** A UK date and time (`YYYY-MM-DDTHH:mm`), used when scheduling. */
  publishAt: string;
};

/**
 * "save" keeps an update's state (a new one is a draft); "publish" makes it
 * live now; "schedule" holds it until `publishAt`.
 */
export type UpdateIntent = "save" | "publish" | "schedule";

export function isUpdateIntent(value: unknown): value is UpdateIntent {
  return value === "save" || value === "publish" || value === "schedule";
}

export type ParsedUpdateForm =
  | {
      ok: true;
      update: {
        title: string;
        body: string;
        titleCy: string | null;
        bodyCy: string | null;
        /** Set only when the form was checked for a schedule. */
        scheduledFor?: Date | null;
      };
    }
  | { ok: false; errors: Partial<Record<UpdateFieldName, UpdateErrorCode>> };

export function readUpdateValues(
  get: (name: string) => unknown,
): UpdateFormValues {
  const text = (name: string) => {
    const value = get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    title: text("title"),
    body: text("body"),
    titleCy: text("titleCy"),
    bodyCy: text("bodyCy"),
    publishAt: text("publishAt"),
  };
}

/**
 * Checks a submitted form field by field so the owner is told exactly which
 * box to fix. Welsh is all-or-nothing: a half-written Welsh version is
 * refused rather than shown to Welsh readers as a title with no text.
 */
export function parseUpdateForm(
  values: UpdateFormValues,
  options: {
    intent?: UpdateIntent;
    /** The update being edited is already scheduled, so a "save" keeps its time. */
    wasScheduled?: boolean;
    now?: Date;
  } = {},
): ParsedUpdateForm {
  const errors: Partial<Record<UpdateFieldName, UpdateErrorCode>> = {};
  const title = cleanUpdateText(values.title).replace(/\s*\n\s*/g, " ");
  const body = cleanUpdateText(values.body);
  const titleCy = cleanUpdateText(values.titleCy).replace(/\s*\n\s*/g, " ");
  const bodyCy = cleanUpdateText(values.bodyCy);

  if (title.length < updateLimits.titleMin) errors.title = "titleShort";
  else if (title.length > updateLimits.titleMax) errors.title = "titleLong";
  if (body.length < updateLimits.bodyMin) errors.body = "bodyShort";
  else if (body.length > updateLimits.bodyMax) errors.body = "bodyLong";

  if (titleCy || bodyCy) {
    if (!titleCy) errors.titleCy = "welshTitleMissing";
    else if (titleCy.length > updateLimits.titleMax) {
      errors.titleCy = "welshTitleLong";
    }
    if (!bodyCy) errors.bodyCy = "welshBodyMissing";
    else if (bodyCy.length > updateLimits.bodyMax) {
      errors.bodyCy = "welshBodyLong";
    }
  }

  let scheduledFor: Date | null = null;
  const checkSchedule =
    options.intent === "schedule" ||
    (options.intent === "save" && options.wasScheduled === true);
  if (checkSchedule) {
    const parsedTime = parseLondonInput(values.publishAt);
    if (parsedTime === null) errors.publishAt = "publishAtMissing";
    else if (parsedTime === "invalid") errors.publishAt = "publishAtInvalid";
    else {
      const { earliest, latest } = scheduleBounds(options.now ?? new Date());
      // Saving an already scheduled update keeps its time, which may by now
      // be only minutes away, so the minimum lead applies to a new schedule.
      if (
        options.intent === "schedule" &&
        parsedTime.getTime() < earliest.getTime()
      ) {
        errors.publishAt = "publishAtSoon";
      } else if (parsedTime.getTime() > latest.getTime()) {
        errors.publishAt = "publishAtFar";
      } else scheduledFor = parsedTime;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    update: {
      title,
      body,
      titleCy: titleCy || null,
      bodyCy: bodyCy || null,
      scheduledFor,
    },
  };
}

export type UpdateFormError =
  | "forbidden"
  | "invalid"
  | "not_found"
  | "stale"
  | "limit"
  | "scheduleLimit"
  | "rate"
  | "locked"
  | "image-invalid"
  | "image-limit"
  | "image-storage"
  | "unavailable";

export type UpdateFormState = {
  status: "idle" | "error";
  errors: Partial<Record<UpdateFieldName, UpdateErrorCode>>;
  formError: UpdateFormError | null;
  values: UpdateFormValues;
  /** Bumped on every refusal so the page can move focus to the summary. */
  attempt: number;
};

export const initialUpdateFormState: UpdateFormState = {
  status: "idle",
  errors: {},
  formError: null,
  values: { title: "", body: "", titleCy: "", bodyCy: "", publishAt: "" },
  attempt: 0,
};
