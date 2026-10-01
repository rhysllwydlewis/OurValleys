import {
  onboardingExceptionalHoursDaySchema,
  onboardingOpeningHoursDraftSchema,
  type OnboardingOpeningHoursDraft,
} from "./onboarding-draft";

export const weekdayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof weekdayOrder)[number];

export const weekdayLabels: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type Reader = (name: string) => string;

function time(read: Reader, name: string): string | null {
  const value = read(name).trim();
  return value.length > 0 ? value : null;
}

/**
 * Builds the weekly-hours payload from form fields. A closed day never
 * carries times, so a stale time left in a ticked-closed row is ignored.
 * Validation (open days need ordered times) is left to the shared schema.
 */
export function parseWeeklyHoursForm(read: Reader) {
  return weekdayOrder.map((day) => {
    const closed = read(`closed-${day}`) === "on";
    return {
      day,
      closed,
      opensAt: closed ? null : time(read, `opens-${day}`),
      closesAt: closed ? null : time(read, `closes-${day}`),
    };
  });
}

export function parseSpecialDayForm(read: Reader) {
  const closed = read("closed") === "on";
  return {
    date: read("date").trim(),
    closed,
    opensAt: closed ? null : time(read, "opens"),
    closesAt: closed ? null : time(read, "closes"),
    note: read("note").trim() || null,
  };
}

/** Field name to message, using the form's own input names. */
export type FieldErrors = Record<string, string>;

export type HoursFormState = {
  /** "error" when the last submission was refused and nothing was saved. */
  status: "idle" | "error";
  /** One line for the alert region; empty when there is no error. */
  summary: string;
  fieldErrors: FieldErrors;
  /** The raw submitted fields, so the form can show them again. */
  values: Record<string, string>;
  /** Changes on every refusal so the form re-renders with `values`. */
  attempt: number;
};

export const initialHoursFormState: HoursFormState = {
  status: "idle",
  summary: "",
  fieldErrors: {},
  values: {},
  attempt: 0,
};

export type Validation<T> =
  | { ok: true; data: T }
  | { ok: false; summary: string; fieldErrors: FieldErrors };

function summarise(entries: [string, string][]): string {
  const [first] = entries;
  if (!first) return "Check the submitted information and try again.";
  const more = entries.length - 1;
  return more > 0 ? `${first[1]} (and ${more} more to fix.)` : first[1];
}

/**
 * Validates a weekly schedule and reports each problem against the input that
 * caused it, e.g. `closes-tuesday`, so the form can point at the exact field.
 */
export function validateWeeklyHours(
  input: unknown,
): Validation<OnboardingOpeningHoursDraft> {
  const parsed = onboardingOpeningHoursDraftSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: FieldErrors = {};
  const ordered: [string, string][] = [];
  const days = Array.isArray(input) ? input : [];
  for (const issue of parsed.error.issues) {
    const [index, key] = issue.path;
    const entry = typeof index === "number" ? days[index] : undefined;
    const day =
      entry && typeof entry === "object" && "day" in entry
        ? String((entry as { day: unknown }).day)
        : typeof index === "number"
          ? weekdayOrder[index]
          : undefined;
    const label = weekdayLabels[day as Weekday];
    if (!label) {
      fieldErrors["_"] ??= issue.message;
      ordered.push(["_", issue.message]);
      continue;
    }
    const field =
      key === "closesAt"
        ? `closes-${day}`
        : key === "closed"
          ? `closed-${day}`
          : `opens-${day}`;
    const message = `${label}: ${issue.message}`;
    if (!fieldErrors[field]) {
      fieldErrors[field] = issue.message;
      ordered.push([field, message]);
    }
  }
  return { ok: false, summary: summarise(ordered), fieldErrors };
}

/** As `validateWeeklyHours`, for one special day; a past date is an error. */
export function validateSpecialDay(
  input: unknown,
  today: string,
): Validation<ReturnType<typeof onboardingExceptionalHoursDaySchema.parse>> {
  const parsed = onboardingExceptionalHoursDaySchema.safeParse(input);
  const fieldErrors: FieldErrors = {};
  const ordered: [string, string][] = [];
  const add = (field: string, message: string) => {
    if (fieldErrors[field]) return;
    fieldErrors[field] = message;
    ordered.push([field, message]);
  };
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      const field =
        key === "date"
          ? "date"
          : key === "closesAt"
            ? "closes"
            : key === "note"
              ? "note"
              : key === "closed"
                ? "closed"
                : "opens";
      add(
        field,
        field === "date"
          ? "Choose a valid date."
          : field === "note"
            ? "Keep the note to 120 characters."
            : issue.message,
      );
    }
  } else if (parsed.data.date < today) {
    add("date", "Choose today or a later date.");
  }
  if (Object.keys(fieldErrors).length > 0 || !parsed.success) {
    return { ok: false, summary: summarise(ordered), fieldErrors };
  }
  return { ok: true, data: parsed.data };
}
