export const EVENT_WHEN_VALUES = ["today", "weekend", "week"] as const;
export type EventWhen = (typeof EVENT_WHEN_VALUES)[number];

export const EVENT_WHEN_LABELS: Record<EventWhen, string> = {
  today: "Today",
  weekend: "This weekend",
  week: "Next 7 days",
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
  // Weekend: Saturday 00:00 to Monday 00:00. On Sunday the window is today only.
  if (weekday === 6) return { from: now, to: dayAfter(2) };
  if (weekday === 0) return { from: now, to: dayAfter(1) };
  const saturday = dayAfter(6 - weekday);
  return { from: saturday, to: dayAfter(8 - weekday) };
}
