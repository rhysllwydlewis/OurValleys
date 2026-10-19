export const EVENT_WHEN_VALUES = ["today", "weekend", "week", "month"] as const;
export type EventWhen = (typeof EVENT_WHEN_VALUES)[number];

export const EVENT_WHEN_LABELS: Record<EventWhen, string> = {
  today: "Today",
  weekend: "This weekend",
  week: "Next 7 days",
  month: "Next 30 days",
};

export type EventWindow = { from: Date; to: Date };

const TIME_ZONE = "Europe/London";

export function parseEventWhen(value: string | undefined): EventWhen | null {
  return EVENT_WHEN_VALUES.find((option) => option === value) ?? null;
}

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});

/** Offset of Europe/London from UTC at the given instant, in milliseconds. */
function londonOffsetMs(at: Date): number {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(at).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant at which the given London calendar day (y, m, d) begins. */
function londonMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month, day);
  const first = guess - londonOffsetMs(new Date(guess));
  return new Date(guess - londonOffsetMs(new Date(first)));
}

function londonCalendarDay(now: Date): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const shifted = new Date(now.getTime() + londonOffsetMs(now));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

/**
 * Resolves a quick-filter choice into a half-open [from, to) window in
 * Europe/London local time. The window never starts before `now`.
 */
export function resolveEventWindow(when: EventWhen, now: Date): EventWindow {
  const { year, month, day, weekday } = londonCalendarDay(now);
  const dayAfter = (offset: number) =>
    londonMidnight(year, month, day + offset);

  if (when === "today") {
    return { from: now, to: dayAfter(1) };
  }
  if (when === "week") {
    return { from: now, to: dayAfter(7) };
  }
  if (when === "month") {
    return { from: now, to: dayAfter(30) };
  }
  // Weekend: Saturday 00:00 to Monday 00:00. On Sunday the window is today only.
  if (weekday === 6) return { from: now, to: dayAfter(2) };
  if (weekday === 0) return { from: now, to: dayAfter(1) };
  const saturday = dayAfter(6 - weekday);
  return { from: saturday, to: dayAfter(8 - weekday) };
}

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** The Europe/London calendar day of an instant, as `YYYY-MM-DD`. */
export function londonDayKey(at: Date): string {
  const { year, month, day } = londonCalendarDay(at);
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/**
 * The London calendar day `offset` days after the one containing `now`, as
 * `YYYY-MM-DD`. Uses date arithmetic, so it is correct across clock changes.
 */
export function londonDayKeyAfter(now: Date, offset: number): string {
  const { year, month, day } = londonCalendarDay(now);
  return new Date(Date.UTC(year, month, day + offset))
    .toISOString()
    .slice(0, 10);
}

/** A valid real calendar day, or null. Rejects `2026-02-31` and bad shapes. */
export function parseEventDay(value: string | undefined): string | null {
  const match = value ? DAY_KEY.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return value ?? null;
}

/** The instant a London calendar day (`YYYY-MM-DD`) begins. */
export function londonMidnightForDayKey(dayKey: string): Date {
  const match = DAY_KEY.exec(dayKey);
  if (!match) throw new Error("Invalid day key");
  return londonMidnight(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
}

/**
 * The half-open [from, to) window of one London calendar day. For today the
 * window starts at `now`, so events that already finished are not listed.
 */
export function resolveEventDayWindow(dayKey: string, now: Date): EventWindow {
  const match = DAY_KEY.exec(dayKey);
  if (!match) throw new Error("Invalid day key");
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ];
  const start = londonMidnight(year, month, day);
  return {
    from: start.getTime() < now.getTime() ? now : start,
    to: londonMidnight(year, month, day + 1),
  };
}
