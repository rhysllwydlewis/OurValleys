import { londonDayKey } from "./date-window";

const TIME_ZONE = "Europe/London";

/** A `YYYY-MM-DD` key as a UTC-noon instant, safe to format in UTC. */
function dayKeyToDate(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00Z`);
}

/** The year is added when the day is not in the same year as `today`. */
export function formatDayHeading(
  dayKey: string,
  lang: string,
  today?: string,
): string {
  const otherYear = today ? dayKey.slice(0, 4) !== today.slice(0, 4) : false;
  return new Intl.DateTimeFormat(lang, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(otherYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(dayKeyToDate(dayKey));
}

export function formatDayShort(
  dayKey: string,
  lang: string,
): { weekday: string; day: string; month: string } {
  const date = dayKeyToDate(dayKey);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang, { ...options, timeZone: "UTC" }).format(date);
  return {
    weekday: part({ weekday: "short" }),
    day: part({ day: "numeric" }),
    month: part({ month: "short" }),
  };
}

export function formatClock(at: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).format(at);
}

/**
 * The time line of an event row: the start time, and where the event has an
 * end, either the end time (same London day) or a short end date.
 */
export function formatEventTimes(
  event: { startsAt: Date; endsAt: Date | null },
  lang: string,
  untilTemplate: (when: string) => string,
): { start: string; until: string | null } {
  const start = formatClock(event.startsAt, lang);
  if (!event.endsAt) return { start, until: null };
  if (londonDayKey(event.endsAt) === londonDayKey(event.startsAt)) {
    return { start, until: untilTemplate(formatClock(event.endsAt, lang)) };
  }
  const endDate = new Intl.DateTimeFormat(lang, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(event.endsAt);
  return { start, until: untilTemplate(endDate) };
}
