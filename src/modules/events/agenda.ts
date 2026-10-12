import {
  londonDayKey,
  londonDayKeyAfter,
  resolveEventDayWindow,
} from "./date-window";

/** The parts of an event the agenda needs; `PublicEvent` satisfies it. */
export type AgendaEvent = { startsAt: Date; endsAt: Date | null };

export type DayCount = { dayKey: string; count: number };

export type AgendaDay<T extends AgendaEvent> = {
  dayKey: string;
  kind: "today" | "tomorrow" | "date";
  events: Array<{ event: T; happeningNow: boolean }>;
};

/** An event with no end is treated as over after this long, for "happening now". */
const OPEN_ENDED_EVENT_MS = 2 * 60 * 60 * 1000;

function endOf(event: AgendaEvent): Date {
  return (
    event.endsAt ?? new Date(event.startsAt.getTime() + OPEN_ENDED_EVENT_MS)
  );
}

/** True while the event has started and not yet finished. */
export function isHappeningNow(event: AgendaEvent, now: Date): boolean {
  return (
    event.startsAt.getTime() <= now.getTime() &&
    endOf(event).getTime() > now.getTime()
  );
}

/**
 * Groups already-sorted events under the London day they start on. An event
 * that began before the anchor day (today, or the day the visitor picked)
 * and is still running is shown under the anchor day, so a two-day festival
 * is visible on both the days it runs rather than vanishing after day one.
 */
export function groupEventsByDay<T extends AgendaEvent>(
  events: T[],
  now: Date,
  anchorDay: string = londonDayKey(now),
): AgendaDay<T>[] {
  const today = londonDayKey(now);
  const tomorrow = londonDayKeyAfter(now, 1);
  const days = new Map<string, AgendaDay<T>>();
  for (const event of events) {
    const startDay = londonDayKey(event.startsAt);
    const dayKey = startDay < anchorDay ? anchorDay : startDay;
    let group = days.get(dayKey);
    if (!group) {
      group = {
        dayKey,
        kind:
          dayKey === today
            ? "today"
            : dayKey === tomorrow
              ? "tomorrow"
              : "date",
        events: [],
      };
      days.set(dayKey, group);
    }
    // "Happening now" only makes sense under today, not a future day the
    // visitor picked.
    group.events.push({
      event,
      happeningNow: dayKey === today && isHappeningNow(event, now),
    });
  }
  return [...days.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

/**
 * Counts events touching each of `length` consecutive London days starting
 * today. An event counts on every day it overlaps, so a weekend fair shows on
 * Saturday and Sunday.
 */
export function countEventsByDay(
  events: AgendaEvent[],
  now: Date,
  length: number,
): DayCount[] {
  return Array.from({ length }, (_, offset) => {
    const dayKey = londonDayKeyAfter(now, offset);
    const window = resolveEventDayWindow(dayKey, now);
    const count = events.filter((event) => {
      const end = event.endsAt;
      return (
        event.startsAt.getTime() < window.to.getTime() &&
        (end
          ? end.getTime() > window.from.getTime()
          : event.startsAt.getTime() >= window.from.getTime())
      );
    }).length;
    return { dayKey, count };
  });
}
