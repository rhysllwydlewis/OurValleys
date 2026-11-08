import { describe, expect, it } from "vitest";
import {
  currentEventWeek,
  eventsByWeekDay,
  parseEventWeek,
  shiftEventWeek,
  weekDayKeys,
  weekStartOf,
  weekWindow,
} from "./week";
import {
  eventsHref,
  eventsPeriodFeedQuery,
  parseEventFilters,
} from "./event-filters";

const at = (iso: string) => new Date(iso);

describe("parseEventWeek", () => {
  it("normalises any real day to its Monday", () => {
    expect(parseEventWeek("2026-11-08")).toBe("2026-11-02"); // a Sunday
    expect(parseEventWeek("2026-11-02")).toBe("2026-11-02");
    expect(parseEventWeek("2026-11-04")).toBe("2026-11-02");
    expect(parseEventWeek("2027-01-01")).toBe("2026-12-28");
  });

  it("rejects bad shapes, impossible dates and out-of-range years", () => {
    for (const bad of [
      undefined,
      "",
      "2026-02-31",
      "2026-13-01",
      "2026-11",
      "tomorrow",
      "1999-12-27",
      "2200-01-05",
    ]) {
      expect(parseEventWeek(bad)).toBeNull();
    }
  });
});

describe("week arithmetic", () => {
  it("finds the Monday, shifts across years and lists seven days", () => {
    expect(weekStartOf("2026-11-01")).toBe("2026-10-26");
    expect(shiftEventWeek("2026-12-28", 1)).toBe("2027-01-04");
    expect(shiftEventWeek("2026-01-05", -1)).toBe("2025-12-29");
    expect(weekDayKeys("2026-11-02")).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
  });

  it("uses the London calendar for the current week", () => {
    // Sunday 23:30 UTC 2026-08-02 is Monday 3 August in London (BST).
    expect(currentEventWeek(at("2026-08-02T23:30:00Z"))).toBe("2026-08-03");
    expect(currentEventWeek(at("2026-01-04T23:30:00Z"))).toBe("2025-12-29");
  });

  it("spans London midnight to London midnight, across a clock change", () => {
    // Clocks go back on 25 October 2026: that week is 169 hours long.
    const window = weekWindow("2026-10-19");
    expect(window.from.toISOString()).toBe("2026-10-18T23:00:00.000Z");
    expect(window.to.toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
});

describe("eventsByWeekDay", () => {
  it("puts a multi-day event on every day it runs in the week", () => {
    const fair = {
      startsAt: at("2026-11-07T10:00:00Z"),
      endsAt: at("2026-11-09T16:00:00Z"),
    };
    expect([
      ...eventsByWeekDay([fair], "2026-11-02", "2026-11-02").keys(),
    ]).toEqual(["2026-11-07", "2026-11-08"]);
    expect([
      ...eventsByWeekDay([fair], "2026-11-09", "2026-11-02").keys(),
    ]).toEqual(["2026-11-09"]);
  });

  it("never lists days before today", () => {
    const running = {
      startsAt: at("2026-11-02T10:00:00Z"),
      endsAt: at("2026-11-05T16:00:00Z"),
    };
    expect([
      ...eventsByWeekDay([running], "2026-11-02", "2026-11-04").keys(),
    ]).toEqual(["2026-11-04", "2026-11-05"]);
    expect(eventsByWeekDay([running], "2026-10-26", "2026-11-04").size).toBe(0);
  });

  it("does not spill an event ending at midnight into the next day", () => {
    const evening = {
      startsAt: at("2026-12-05T20:00:00Z"),
      endsAt: at("2026-12-06T00:00:00Z"),
    };
    expect([
      ...eventsByWeekDay([evening], "2026-11-30", "2026-11-30").keys(),
    ]).toEqual(["2026-12-05"]);
  });

  it("keeps an open-ended event on its start day and ignores other weeks", () => {
    const open = { startsAt: at("2026-11-20T18:00:00Z"), endsAt: null };
    expect([
      ...eventsByWeekDay([open], "2026-11-16", "2026-11-01").keys(),
    ]).toEqual(["2026-11-20"]);
    expect(eventsByWeekDay([open], "2026-11-23", "2026-11-01").size).toBe(0);
  });
});

describe("week URL state", () => {
  it("parses the week view and normalises the week", () => {
    const filters = parseEventFilters({ view: "week", week: "2026-11-05" });
    expect(filters.view).toBe("week");
    expect(filters.week).toBe("2026-11-02");
    expect(filters.when).toBeNull();
  });

  it("ignores a week outside the week view and an invalid week inside it", () => {
    expect(parseEventFilters({ week: "2026-11-05" }).week).toBeNull();
    expect(parseEventFilters({ view: "week", week: "nope" }).week).toBeNull();
    expect(parseEventFilters({ view: "bogus" }).view).toBe("list");
  });

  it("writes the week into links only for the week view", () => {
    const week = parseEventFilters({
      view: "week",
      week: "2026-11-02",
      q: "x",
    });
    expect(eventsHref(week)).toBe("/events?q=x&view=week&week=2026-11-02");
    expect(eventsHref({ ...week, view: "list" })).toBe("/events?q=x");
  });
});

describe("eventsPeriodFeedQuery", () => {
  it("carries the filters and exactly one period", () => {
    const filters = parseEventFilters({
      q: "market",
      place: "porth",
      view: "month",
      month: "2026-11",
      day: "2026-11-14",
    });
    expect(eventsPeriodFeedQuery(filters, { month: "2026-11" })).toBe(
      "?q=market&place=porth&month=2026-11",
    );
    expect(eventsPeriodFeedQuery(filters, { week: "2026-11-09" })).toBe(
      "?q=market&place=porth&week=2026-11-09",
    );
    expect(eventsPeriodFeedQuery({}, { week: "2026-11-09" })).toBe(
      "?week=2026-11-09",
    );
  });
});
