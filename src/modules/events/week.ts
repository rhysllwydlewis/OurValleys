import {
  londonDayKey,
  londonMidnightForDayKey,
  parseEventDay,
  type EventWindow,
} from "./date-window";
import type { AgendaEvent } from "./agenda";

function addDays(dayKey: string, offset: number): string {
  const [year, month, day] = dayKey.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day + offset))
    .toISOString()
    .slice(0, 10);
}

/** The Monday of the week containing a day key, as `YYYY-MM-DD`. */
export function weekStartOf(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(dayKey, -((weekday + 6) % 7));
}

/**
 * A valid week, given as any real day inside it, normalised to its Monday.
 * Rejects bad shapes and impossible dates.
 */
export function parseEventWeek(value: string | undefined): string | null {
  const day = parseEventDay(value);
  if (!day) return null;
  const year = Number(day.slice(0, 4));
  if (year < 2000 || year > 2199) return null;
  return weekStartOf(day);
}

/** The Monday of the London week containing `at`. */
export function currentEventWeek(at: Date): string {
  return weekStartOf(londonDayKey(at));
}

/** The week `offset` weeks from `week` (a Monday), as its Monday. */
export function shiftEventWeek(week: string, offset: number): string {
  return addDays(week, offset * 7);
}

/** The seven day keys of a week, Monday first. */
export function weekDayKeys(week: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(week, index));
}

/** The half-open [from, to) London window of a whole week. */
export function weekWindow(week: string): EventWindow {
  return {
    from: londonMidnightForDayKey(week),
    to: londonMidnightForDayKey(addDays(week, 7)),
  };
}

/**
 * Events grouped under every London day of the week they touch, following the
 * same rules as the month grid: a multi-day event is on each of its days, days
 * before `today` are never listed (finished days are not public), and an end
 * exactly at midnight does not spill into the next day. Days with nothing are
 * absent from the map.
 */
export function eventsByWeekDay<T extends AgendaEvent>(
  events: T[],
  week: string,
  today: string,
): Map<string, T[]> {
  const window = weekWindow(week);
  const firstDay = week;
  const lastDay = addDays(week, 6);
  const days = new Map<string, T[]>();
  for (const event of events) {
    const startsAt = event.startsAt.getTime();
    const end = event.endsAt?.getTime() ?? startsAt;
    if (startsAt >= window.to.getTime() || end < window.from.getTime()) {
      continue;
    }
    const startKey = londonDayKey(event.startsAt);
    const started = startKey < firstDay ? firstDay : startKey;
    const first = started < today ? today : started;
    const lastInstant =
      event.endsAt && event.endsAt.getTime() > startsAt
        ? new Date(event.endsAt.getTime() - 1)
        : event.startsAt;
    const endKey = londonDayKey(lastInstant);
    const last = endKey > lastDay ? lastDay : endKey;
    for (let dayKey = first; dayKey <= last; dayKey = addDays(dayKey, 1)) {
      const list = days.get(dayKey);
      if (list) list.push(event);
      else days.set(dayKey, [event]);
    }
  }
  return days;
}
