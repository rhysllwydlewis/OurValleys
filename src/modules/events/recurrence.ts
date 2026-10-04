/**
 * Occurrence generation for repeating events. Occurrences are materialised as
 * ordinary `business_event` rows, so public listings, saved events, the
 * calendar export and structured data need no recurrence awareness.
 *
 * Dates are stepped on the Europe/London wall clock so a 19:00 quiz stays at
 * 19:00 across the clock changes instead of drifting by an hour.
 */

export const eventRepeatFrequencies = [
  "weekly",
  "fortnightly",
  "monthly",
] as const;
export type EventRepeatFrequency = (typeof eventRepeatFrequencies)[number];

/** Upper bound on occurrences per series, including the first. */
export const MAX_EVENT_OCCURRENCES = 26;

const LONDON = "Europe/London";
const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

type WallClock = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function toWallClock(instant: Date): WallClock {
  const parts = Object.fromEntries(
    londonParts.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function londonOffsetMs(instant: Date): number {
  const wall = toWallClock(instant);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

function fromWallClock(wall: WallClock): Date {
  const naive = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  let result = naive - londonOffsetMs(new Date(naive));
  // Re-resolve once so times near a clock change pick the right offset.
  result = naive - londonOffsetMs(new Date(result));
  return new Date(result);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Same weekday and ordinal in the target month (for example the second
 * Tuesday). A fifth weekday falls back to the last one in shorter months.
 */
function monthlyDay(anchor: WallClock, year: number, month: number): number {
  const weekday = new Date(
    Date.UTC(anchor.year, anchor.month - 1, anchor.day),
  ).getUTCDay();
  const ordinal = Math.ceil(anchor.day / 7);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const first = 1 + ((weekday - firstWeekday + 7) % 7);
  const day = first + (ordinal - 1) * 7;
  const length = daysInMonth(year, month);
  return day <= length ? day : day - 7;
}

/**
 * Returns `count` start/end pairs beginning with the supplied event, or just
 * the supplied event when the count is below two. The count is clamped to
 * `MAX_EVENT_OCCURRENCES`.
 */
export function generateEventOccurrences(input: {
  startsAt: Date;
  endsAt: Date | null;
  frequency: EventRepeatFrequency;
  count: number;
}): { startsAt: Date; endsAt: Date | null }[] {
  const count = Math.min(
    Math.max(Math.trunc(input.count) || 1, 1),
    MAX_EVENT_OCCURRENCES,
  );
  const durationMs = input.endsAt
    ? input.endsAt.getTime() - input.startsAt.getTime()
    : null;
  const anchor = toWallClock(input.startsAt);
  const occurrences: { startsAt: Date; endsAt: Date | null }[] = [];

  for (let index = 0; index < count; index += 1) {
    let startsAt: Date;
    if (index === 0) {
      startsAt = input.startsAt;
    } else if (input.frequency === "monthly") {
      const monthIndex = anchor.month - 1 + index;
      const year = anchor.year + Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      startsAt = fromWallClock({
        ...anchor,
        year,
        month,
        day: monthlyDay(anchor, year, month),
      });
    } else {
      const stepDays = input.frequency === "weekly" ? 7 : 14;
      const shifted = new Date(
        Date.UTC(anchor.year, anchor.month - 1, anchor.day + stepDays * index),
      );
      startsAt = fromWallClock({
        ...anchor,
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
      });
    }
    occurrences.push({
      startsAt,
      endsAt:
        durationMs === null ? null : new Date(startsAt.getTime() + durationMs),
    });
  }
  return occurrences;
}
