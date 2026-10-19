import {
  londonDayKey,
  londonMidnightForDayKey,
  type EventWindow,
} from "./date-window";
import type { AgendaEvent } from "./agenda";

const MONTH_KEY = /^(\d{4})-(\d{2})$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2199;

/** A valid calendar month, `YYYY-MM`, or null. Rejects `2026-13` and bad shapes. */
export function parseEventMonth(value: string | undefined): string | null {
  const match = value ? MONTH_KEY.exec(value) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < MIN_YEAR || year > MAX_YEAR) {
    return null;
  }
  return value ?? null;
}

/** The month containing a London day key, as `YYYY-MM`. */
export function monthOfDay(dayKey: string): string {
  return dayKey.slice(0, 7);
}

/** The London month containing `at`, as `YYYY-MM`. */
export function currentEventMonth(at: Date): string {
  return monthOfDay(londonDayKey(at));
}

/** The month `offset` months from `month`, as `YYYY-MM`. */
export function shiftEventMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const shifted = new Date(Date.UTC(year, number - 1 + offset, 1));
  return shifted.toISOString().slice(0, 7);
}

/** The half-open [from, to) London window of a whole month. */
export function monthWindow(month: string): EventWindow {
  return {
    from: londonMidnightForDayKey(`${month}-01`),
    to: londonMidnightForDayKey(`${shiftEventMonth(month, 1)}-01`),
  };
}

export type MonthCell = {
  dayKey: string;
  /** False for the leading and trailing days of neighbouring months. */
  inMonth: boolean;
};

/**
 * The month as Monday-first weeks of seven days, padded with the days of the
 * neighbouring months so every row is complete (four to six rows).
 */
export function buildMonthGrid(month: string): MonthCell[][] {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(year, number - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const rows = Math.ceil((lead + daysInMonth) / 7);
  const weeks: MonthCell[][] = [];
  for (let row = 0; row < rows; row += 1) {
    const week: MonthCell[] = [];
    for (let column = 0; column < 7; column += 1) {
      const date = new Date(
        Date.UTC(year, number - 1, 1 - lead + row * 7 + column),
      );
      const dayKey = date.toISOString().slice(0, 10);
      week.push({ dayKey, inMonth: monthOfDay(dayKey) === month });
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * Events grouped under every London day of the month they touch. An event
 * that runs over several days appears on each of them, so a weekend fair is
 * on both Saturday and Sunday. Days with nothing are absent from the map.
 */
export function eventsByMonthDay<T extends AgendaEvent>(
  events: T[],
  month: string,
): Map<string, T[]> {
  const window = monthWindow(month);
  const days = new Map<string, T[]>();
  for (const event of events) {
    const startsAt = event.startsAt.getTime();
    const end = event.endsAt?.getTime() ?? startsAt;
    if (startsAt >= window.to.getTime() || end < window.from.getTime()) {
      continue;
    }
    const first = clampDay(londonDayKey(event.startsAt), month, "start");
    // An end exactly at midnight does not spill into the next day.
    const lastInstant =
      event.endsAt && event.endsAt.getTime() > startsAt
        ? new Date(event.endsAt.getTime() - 1)
        : event.startsAt;
    const last = clampDay(londonDayKey(lastInstant), month, "end");
    for (let dayKey = first; dayKey <= last; dayKey = nextDayKey(dayKey)) {
      const list = days.get(dayKey);
      if (list) list.push(event);
      else days.set(dayKey, [event]);
    }
  }
  return days;
}

function nextDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
}

function clampDay(dayKey: string, month: string, edge: "start" | "end") {
  if (monthOfDay(dayKey) === month) return dayKey;
  if (edge === "start") return `${month}-01`;
  const lastDay = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
}
