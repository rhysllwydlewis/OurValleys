/**
 * Whether a business is open right now, what it does today and what the next
 * seven days look like. Pure and free of server-only imports so the same code
 * answers on the server (first paint) and in the browser (keeping the answer
 * current while a page stays open).
 *
 * Everything is in Europe/London wall-clock time, matching how owners enter
 * hours. A special-day entry replaces the weekly rule for its date entirely,
 * exactly as the directory's "open now" filter does.
 */

import {
  addDaysToDateString,
  londonDateString,
} from "./opening-hours-exceptions";

/** Minutes before closing at which "open" becomes "closing soon". */
export const CLOSING_SOON_MINUTES = 60;
/** How many days ahead to look for the next time the business opens. */
export const NEXT_OPENING_LOOKAHEAD_DAYS = 14;

/** One day's times. `null` times mean closed. 0 = Sunday, as in the database. */
export type ScheduleWeekday = {
  opens: string | null;
  closes: string | null;
  /** An optional second window, such as the evening after a lunch break. */
  secondOpens?: string | null;
  secondCloses?: string | null;
};

/** One continuous stretch of opening, as "HH:MM" clock times. */
export type TimeWindow = { opens: string; closes: string };

export type ScheduleException = {
  date: string;
  /** Null times mean closed all day. */
  opens: string | null;
  closes: string | null;
  note: string | null;
};

export type OpeningSchedule = {
  /** Seven entries, index 0 = Sunday. A missing rule is a closed day. */
  weekly: ScheduleWeekday[];
  exceptions: ScheduleException[];
};

/** What happens on one calendar day, after any special day is applied. */
export type ResolvedDay = {
  date: string;
  /** 0 = Sunday. */
  dayOfWeek: number;
  opens: string | null;
  closes: string | null;
  /**
   * Every opening window in time order. `opens` and `closes` above are the
   * start of the first and the end of the last, for callers that only need the
   * span of the day.
   */
  windows: TimeWindow[];
  /** True when a special-day entry decided this day. */
  special: boolean;
  note: string | null;
};

export type OpeningStatus =
  | {
      kind: "open";
      closesAt: string;
      /** Whole minutes until closing. */
      minutesLeft: number;
      closingSoon: boolean;
      today: ResolvedDay;
    }
  | {
      kind: "opens-later";
      opensAt: string;
      today: ResolvedDay;
    }
  | {
      /** Between two windows of the same day, such as a lunch break. */
      kind: "on-break";
      reopensAt: string;
      today: ResolvedDay;
    }
  | {
      kind: "closed";
      /** Why today is closed, when the owner wrote a reason. */
      note: string | null;
      /** The next day it opens, if within the look-ahead. */
      next: NextOpening | null;
      today: ResolvedDay;
    }
  | { kind: "unknown" };

export type NextOpening = {
  date: string;
  dayOfWeek: number;
  opensAt: string;
  /** 1 = tomorrow. */
  daysAway: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** The London date, weekday and minutes since midnight of an instant. */
export function londonClock(now: Date): {
  date: string;
  dayOfWeek: number;
  minutes: number;
} {
  const parts = clockFormat.formatToParts(now);
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(pick("hour")) % 24;
  const minute = Number(pick("minute"));
  return {
    date: londonDateString(now),
    dayOfWeek: WEEKDAY_INDEX[pick("weekday")] ?? 0,
    minutes: hour * 60 + minute,
  };
}

/** "HH:MM" to minutes since midnight, or null when it is not a clock time. */
export function clockToMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function dayOfWeekOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** A day is open only with two valid, ordered times. */
function usableTimes(
  opens: string | null,
  closes: string | null,
): { opens: string; closes: string } | null {
  const from = clockToMinutes(opens);
  const to = clockToMinutes(closes);
  if (from === null || to === null || from >= to) return null;
  return { opens: opens as string, closes: closes as string };
}

/**
 * The usable windows of a rule, in order. A second window counts only when it
 * is valid and starts after the first has closed; anything else is ignored
 * rather than guessed at, so bad data can never show a misleading status.
 */
function usableWindows(rule: ScheduleWeekday | undefined): TimeWindow[] {
  if (!rule) return [];
  const first = usableTimes(rule.opens, rule.closes);
  if (!first) return [];
  const second = usableTimes(
    rule.secondOpens ?? null,
    rule.secondCloses ?? null,
  );
  if (
    second &&
    (clockToMinutes(second.opens) as number) >
      (clockToMinutes(first.closes) as number)
  ) {
    return [first, second];
  }
  return [first];
}

/** The usable weekly windows for a day of the week (0 = Sunday), ignoring special days. */
export function weeklyWindows(
  schedule: OpeningSchedule,
  dayOfWeek: number,
): TimeWindow[] {
  return usableWindows(schedule.weekly[dayOfWeek]);
}

/** "09:00–12:00, 13:00–17:00" for a day's windows; null when it has none. */
export function formatWindows(windows: readonly TimeWindow[]): string | null {
  if (windows.length === 0) return null;
  return windows.map((window) => `${window.opens}–${window.closes}`).join(", ");
}

function dayFromWindows(
  date: string,
  dayOfWeek: number,
  windows: TimeWindow[],
  special: boolean,
  note: string | null,
): ResolvedDay {
  return {
    date,
    dayOfWeek,
    opens: windows[0]?.opens ?? null,
    closes: windows[windows.length - 1]?.closes ?? null,
    windows,
    special,
    note,
  };
}

/** The hours that apply on `date`: a special day wins over the weekly rule. */
export function resolveDay(
  schedule: OpeningSchedule,
  date: string,
): ResolvedDay {
  const dayOfWeek = dayOfWeekOf(date);
  const exception = schedule.exceptions.find((entry) => entry.date === date);
  if (exception) {
    // Special days stay a single window: they replace the whole day.
    const times = usableTimes(exception.opens, exception.closes);
    return dayFromWindows(
      date,
      dayOfWeek,
      times ? [times] : [],
      true,
      exception.note,
    );
  }
  return dayFromWindows(
    date,
    dayOfWeek,
    usableWindows(schedule.weekly[dayOfWeek]),
    false,
    null,
  );
}

/** True when no day of the week has hours and no special day opens either. */
export function hasAnyHours(schedule: OpeningSchedule): boolean {
  return (
    schedule.weekly.some((day) => usableWindows(day).length > 0) ||
    schedule.exceptions.some((day) => usableTimes(day.opens, day.closes))
  );
}

function findNextOpening(
  schedule: OpeningSchedule,
  today: string,
): NextOpening | null {
  for (let ahead = 1; ahead <= NEXT_OPENING_LOOKAHEAD_DAYS; ahead += 1) {
    const day = resolveDay(schedule, addDaysToDateString(today, ahead));
    if (day.opens) {
      return {
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        opensAt: day.opens,
        daysAway: ahead,
      };
    }
  }
  return null;
}

export function openingStatus(
  schedule: OpeningSchedule,
  now: Date,
): OpeningStatus {
  if (!hasAnyHours(schedule)) return { kind: "unknown" };
  const clock = londonClock(now);
  const today = resolveDay(schedule, clock.date);
  for (const [index, window] of today.windows.entries()) {
    const opens = clockToMinutes(window.opens) as number;
    const closes = clockToMinutes(window.closes) as number;
    if (clock.minutes >= opens && clock.minutes < closes) {
      const minutesLeft = closes - clock.minutes;
      return {
        kind: "open",
        closesAt: window.closes,
        minutesLeft,
        closingSoon: minutesLeft <= CLOSING_SOON_MINUTES,
        today,
      };
    }
    if (clock.minutes < opens) {
      return index === 0
        ? { kind: "opens-later", opensAt: window.opens, today }
        : { kind: "on-break", reopensAt: window.opens, today };
    }
  }
  return {
    kind: "closed",
    note: today.note,
    next: findNextOpening(schedule, clock.date),
    today,
  };
}

/** Today and the following days, with special days applied. */
export function weekOutlook(
  schedule: OpeningSchedule,
  now: Date,
  days = 7,
): ResolvedDay[] {
  const start = londonDateString(now);
  return Array.from({ length: days }, (_, index) =>
    resolveDay(schedule, addDaysToDateString(start, index)),
  );
}

/** Builds a schedule from rows keyed by day of week (0 = Sunday). */
export function buildSchedule(
  weeklyRows: Array<{
    dayOfWeek: number;
    isClosed: boolean;
    opensAt: string | null;
    closesAt: string | null;
    secondOpensAt?: string | null;
    secondClosesAt?: string | null;
  }>,
  exceptionRows: Array<{
    date: string;
    isClosed: boolean;
    opensAt: string | null;
    closesAt: string | null;
    note: string | null;
  }>,
): OpeningSchedule {
  const weekly: ScheduleWeekday[] = Array.from({ length: 7 }, () => ({
    opens: null,
    closes: null,
  }));
  for (const row of weeklyRows) {
    if (row.dayOfWeek < 0 || row.dayOfWeek > 6 || row.isClosed) continue;
    weekly[row.dayOfWeek] = {
      opens: row.opensAt,
      closes: row.closesAt,
      secondOpens: row.secondOpensAt ?? null,
      secondCloses: row.secondClosesAt ?? null,
    };
  }
  return {
    weekly,
    exceptions: exceptionRows.map((row) => ({
      date: row.date,
      opens: row.isClosed ? null : row.opensAt,
      closes: row.isClosed ? null : row.closesAt,
      note: row.note,
    })),
  };
}

const WEEKDAY_NUMBER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** The owner editor's rows (named weekdays) as a schedule. */
export function scheduleFromOwnerHours(
  weekly: Array<{
    day: string;
    closed: boolean;
    opensAt: string | null;
    closesAt: string | null;
    secondOpensAt?: string | null;
    secondClosesAt?: string | null;
  }>,
  specialDays: Array<{
    date: string;
    closed: boolean;
    opensAt: string | null;
    closesAt: string | null;
    note: string | null;
  }>,
): OpeningSchedule {
  return buildSchedule(
    weekly.flatMap((row) => {
      const dayOfWeek = WEEKDAY_NUMBER[row.day];
      return dayOfWeek === undefined
        ? []
        : [
            {
              dayOfWeek,
              isClosed: row.closed,
              opensAt: row.opensAt,
              closesAt: row.closesAt,
              secondOpensAt: row.secondOpensAt ?? null,
              secondClosesAt: row.secondClosesAt ?? null,
            },
          ];
    }),
    specialDays.map((day) => ({
      date: day.date,
      isClosed: day.closed,
      opensAt: day.opensAt,
      closesAt: day.closesAt,
      note: day.note,
    })),
  );
}
