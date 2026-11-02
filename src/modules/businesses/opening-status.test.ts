import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  clockToMinutes,
  hasAnyHours,
  londonClock,
  openingStatus,
  resolveDay,
  weekOutlook,
} from "./opening-status";

// Mon-Fri 09:00-17:30, Saturday 10:00-14:00, Sunday closed.
const weeklyRows = [
  { dayOfWeek: 0, isClosed: true, opensAt: null, closesAt: null },
  ...[1, 2, 3, 4, 5].map((dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    opensAt: "09:00",
    closesAt: "17:30",
  })),
  { dayOfWeek: 6, isClosed: false, opensAt: "10:00", closesAt: "14:00" },
];

function schedule(
  exceptions: Parameters<typeof buildSchedule>[1] = [],
  weekly = weeklyRows,
) {
  return buildSchedule(weekly, exceptions);
}

// 2026-07-15 is a Wednesday; London is on BST (UTC+1).
const at = (isoUtc: string) => new Date(isoUtc);

describe("londonClock", () => {
  it("reads London wall-clock time in summer and winter", () => {
    expect(londonClock(at("2026-07-15T11:05:00Z"))).toEqual({
      date: "2026-07-15",
      dayOfWeek: 3,
      minutes: 12 * 60 + 5,
    });
    expect(londonClock(at("2026-01-14T11:05:00Z")).minutes).toBe(11 * 60 + 5);
  });

  it("rolls the date at London midnight, not UTC midnight", () => {
    const clock = londonClock(at("2026-07-15T23:30:00Z"));
    expect(clock.date).toBe("2026-07-16");
    expect(clock.dayOfWeek).toBe(4);
    expect(clock.minutes).toBe(30);
  });

  it("treats the hour 24 some runtimes print as midnight", () => {
    expect(londonClock(at("2026-01-15T00:00:00Z")).minutes).toBe(0);
  });
});

describe("clockToMinutes", () => {
  it("accepts HH:MM only", () => {
    expect(clockToMinutes("09:30")).toBe(570);
    expect(clockToMinutes("24:00")).toBeNull();
    expect(clockToMinutes("9:30")).toBeNull();
    expect(clockToMinutes(null)).toBeNull();
  });
});

describe("openingStatus", () => {
  it("is open during opening hours and reports when it closes", () => {
    const status = openingStatus(schedule(), at("2026-07-15T09:00:00Z")); // 10:00
    expect(status).toMatchObject({
      kind: "open",
      closesAt: "17:30",
      closingSoon: false,
      minutesLeft: 450,
    });
  });

  it("flags closing soon within the last hour", () => {
    const status = openingStatus(schedule(), at("2026-07-15T15:45:00Z")); // 16:45
    expect(status).toMatchObject({
      kind: "open",
      closingSoon: true,
      minutesLeft: 45,
    });
  });

  it("opens at the opening minute and closes at the closing minute", () => {
    expect(openingStatus(schedule(), at("2026-07-15T08:00:00Z")).kind).toBe(
      "open",
    ); // 09:00 exactly
    expect(openingStatus(schedule(), at("2026-07-15T16:30:00Z")).kind).toBe(
      "closed",
    ); // 17:30 exactly
  });

  it("says when it opens later today", () => {
    expect(openingStatus(schedule(), at("2026-07-15T06:00:00Z"))).toMatchObject(
      { kind: "opens-later", opensAt: "09:00" },
    ); // 07:00
  });

  it("points at tomorrow after closing", () => {
    const status = openingStatus(schedule(), at("2026-07-15T18:00:00Z")); // 19:00
    expect(status).toMatchObject({
      kind: "closed",
      next: { daysAway: 1, opensAt: "09:00", dayOfWeek: 4 },
    });
  });

  it("skips a closed Sunday to find Monday", () => {
    const status = openingStatus(schedule(), at("2026-07-19T11:00:00Z")); // Sunday
    expect(status).toMatchObject({
      kind: "closed",
      next: { daysAway: 1, dayOfWeek: 1, opensAt: "09:00" },
    });
  });

  it("lets a special day close a normally open day, with its reason", () => {
    const status = openingStatus(
      schedule([
        {
          date: "2026-12-25",
          isClosed: true,
          opensAt: null,
          closesAt: null,
          note: "Christmas Day",
        },
      ]),
      at("2026-12-25T11:00:00Z"),
    );
    expect(status).toMatchObject({ kind: "closed", note: "Christmas Day" });
    expect(status.kind === "closed" && status.next?.date).toBe("2026-12-26");
  });

  it("lets a special day open a normally closed day", () => {
    const status = openingStatus(
      schedule([
        {
          date: "2026-07-19",
          isClosed: false,
          opensAt: "11:00",
          closesAt: "15:00",
          note: null,
        },
      ]),
      at("2026-07-19T11:00:00Z"), // 12:00
    );
    expect(status).toMatchObject({ kind: "open", closesAt: "15:00" });
  });

  it("uses winter time after the clocks go back", () => {
    // 2026-10-26 is a Monday; London is on GMT (UTC+0), so 09:00Z is 09:00.
    expect(openingStatus(schedule(), at("2026-10-26T08:59:00Z")).kind).toBe(
      "opens-later",
    );
    expect(openingStatus(schedule(), at("2026-10-26T09:00:00Z")).kind).toBe(
      "open",
    );
    // The Sunday the clocks go back still resolves to that London date.
    expect(londonClock(at("2026-10-25T00:30:00Z")).date).toBe("2026-10-25");
  });

  it("is unknown when no hours were ever supplied", () => {
    const empty = buildSchedule([], []);
    expect(hasAnyHours(empty)).toBe(false);
    expect(openingStatus(empty, at("2026-07-15T11:00:00Z"))).toEqual({
      kind: "unknown",
    });
  });

  it("has no next opening when closed for the whole look-ahead", () => {
    const lone = buildSchedule(
      [{ dayOfWeek: 1, isClosed: false, opensAt: "09:00", closesAt: "10:00" }],
      Array.from({ length: 30 }, (_, index) => ({
        date: new Date(Date.UTC(2026, 6, 16 + index))
          .toISOString()
          .slice(0, 10),
        isClosed: true,
        opensAt: null,
        closesAt: null,
        note: null,
      })),
    );
    const status = openingStatus(lone, at("2026-07-15T18:00:00Z"));
    expect(status).toMatchObject({ kind: "closed", next: null });
  });

  it("ignores malformed or reversed times rather than guessing", () => {
    const broken = buildSchedule(
      [
        { dayOfWeek: 3, isClosed: false, opensAt: "17:00", closesAt: "09:00" },
        { dayOfWeek: 4, isClosed: false, opensAt: null, closesAt: "09:00" },
      ],
      [],
    );
    expect(resolveDay(broken, "2026-07-15").opens).toBeNull();
    expect(hasAnyHours(broken)).toBe(false);
  });
});

describe("weekOutlook", () => {
  it("lists seven days from today with special days applied", () => {
    const days = weekOutlook(
      schedule([
        {
          date: "2026-07-17",
          isClosed: true,
          opensAt: null,
          closesAt: null,
          note: "Staff day",
        },
      ]),
      at("2026-07-15T11:00:00Z"),
    );
    expect(days.map((day) => day.date)).toEqual([
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
      "2026-07-21",
    ]);
    expect(days[2]).toMatchObject({
      opens: null,
      special: true,
      note: "Staff day",
    });
    expect(days[4]).toMatchObject({ opens: null, special: false });
    expect(days[3]).toMatchObject({ opens: "10:00", closes: "14:00" });
  });
});

describe("split opening hours", () => {
  // Wednesday 09:00-12:00 and 13:00-17:00; every other day as above.
  const splitRows = weeklyRows.map((row) =>
    row.dayOfWeek === 3
      ? {
          ...row,
          opensAt: "09:00",
          closesAt: "12:00",
          secondOpensAt: "13:00",
          secondClosesAt: "17:00",
        }
      : row,
  );
  const split = schedule([], splitRows);

  it("is open in the first window and reports its own closing time", () => {
    expect(openingStatus(split, at("2026-07-15T09:00:00Z"))).toMatchObject({
      kind: "open",
      closesAt: "12:00",
    }); // 10:00 London
  });

  it("is on a break between the windows and says when it reopens", () => {
    expect(openingStatus(split, at("2026-07-15T11:30:00Z"))).toMatchObject({
      kind: "on-break",
      reopensAt: "13:00",
    }); // 12:30 London
  });

  it("is open again in the second window", () => {
    expect(openingStatus(split, at("2026-07-15T13:00:00Z"))).toMatchObject({
      kind: "open",
      closesAt: "17:00",
      closingSoon: false,
    }); // 14:00 London
  });

  it("is closed after the second window and looks ahead to tomorrow", () => {
    expect(openingStatus(split, at("2026-07-15T17:00:00Z"))).toMatchObject({
      kind: "closed",
      next: { daysAway: 1, opensAt: "09:00" },
    });
  });

  it("is still before-opening ('opens later') ahead of the first window", () => {
    expect(openingStatus(split, at("2026-07-15T06:30:00Z"))).toMatchObject({
      kind: "opens-later",
      opensAt: "09:00",
    });
  });

  it("resolves a day to both windows, with the span as opens and closes", () => {
    const day = resolveDay(split, "2026-07-15");
    expect(day.windows).toEqual([
      { opens: "09:00", closes: "12:00" },
      { opens: "13:00", closes: "17:00" },
    ]);
    expect(day.opens).toBe("09:00");
    expect(day.closes).toBe("17:00");
  });

  it("ignores a second window that overlaps or precedes the first", () => {
    for (const [secondOpensAt, secondClosesAt] of [
      ["11:00", "15:00"],
      ["12:00", "15:00"],
      ["06:00", "08:00"],
      ["13:00", null],
    ] as const) {
      const rows = splitRows.map((row) =>
        row.dayOfWeek === 3 ? { ...row, secondOpensAt, secondClosesAt } : row,
      );
      expect(resolveDay(schedule([], rows), "2026-07-15").windows).toEqual([
        { opens: "09:00", closes: "12:00" },
      ]);
    }
  });

  it("lets a special day replace both windows", () => {
    const withSpecial = schedule(
      [
        {
          date: "2026-07-15",
          isClosed: false,
          opensAt: "10:00",
          closesAt: "14:00",
          note: null,
        },
      ],
      splitRows,
    );
    expect(resolveDay(withSpecial, "2026-07-15").windows).toEqual([
      { opens: "10:00", closes: "14:00" },
    ]);
  });
});
