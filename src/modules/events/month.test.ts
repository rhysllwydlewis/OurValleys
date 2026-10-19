import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  currentEventMonth,
  eventsByMonthDay,
  monthWindow,
  parseEventMonth,
  shiftEventMonth,
} from "./month";
import { parseEventFilters, eventsHref } from "./event-filters";

describe("parseEventMonth", () => {
  it("accepts real months and rejects everything else", () => {
    expect(parseEventMonth("2026-11")).toBe("2026-11");
    for (const bad of [
      undefined,
      "",
      "2026-13",
      "2026-00",
      "2026-1",
      "26-11",
      "2026-11-01",
      "1999-12",
      "2200-01",
      "abcd-ef",
    ]) {
      expect(parseEventMonth(bad)).toBeNull();
    }
  });
});

describe("shiftEventMonth", () => {
  it("crosses year boundaries both ways", () => {
    expect(shiftEventMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftEventMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftEventMonth("2026-03", 0)).toBe("2026-03");
  });
});

describe("currentEventMonth", () => {
  it("uses the London calendar, not UTC", () => {
    // 23:30 UTC on 31 July is already 1 August in London (BST).
    expect(currentEventMonth(new Date("2026-07-31T23:30:00Z"))).toBe("2026-08");
    expect(currentEventMonth(new Date("2026-01-31T23:30:00Z"))).toBe("2026-01");
  });
});

describe("monthWindow", () => {
  it("runs from London midnight to London midnight", () => {
    const summer = monthWindow("2026-07");
    expect(summer.from.toISOString()).toBe("2026-06-30T23:00:00.000Z");
    expect(summer.to.toISOString()).toBe("2026-07-31T23:00:00.000Z");
    const winter = monthWindow("2026-12");
    expect(winter.from.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("buildMonthGrid", () => {
  it("is Monday first with complete weeks", () => {
    // 1 November 2026 is a Sunday.
    const grid = buildMonthGrid("2026-11");
    expect(grid[0]?.[0]?.dayKey).toBe("2026-10-26");
    expect(grid[0]?.[6]).toEqual({ dayKey: "2026-11-01", inMonth: true });
    expect(grid[0]?.[0]?.inMonth).toBe(false);
    for (const week of grid) expect(week).toHaveLength(7);
    expect(grid.flat().filter((cell) => cell.inMonth)).toHaveLength(30);
  });

  it("uses four rows when February starts on a Monday", () => {
    // 1 February 2027 is a Monday and the month has 28 days.
    expect(buildMonthGrid("2027-02")).toHaveLength(4);
  });

  it("uses six rows when a long month starts late in the week", () => {
    // 1 August 2026 is a Saturday, 31 days.
    expect(buildMonthGrid("2026-08")).toHaveLength(6);
  });
});

describe("eventsByMonthDay", () => {
  const at = (iso: string) => new Date(iso);

  it("puts a multi-day event on every day it runs", () => {
    const fair = {
      startsAt: at("2026-11-14T10:00:00Z"),
      endsAt: at("2026-11-15T16:00:00Z"),
    };
    const days = eventsByMonthDay([fair], "2026-11", "2026-11-01");
    expect([...days.keys()]).toEqual(["2026-11-14", "2026-11-15"]);
  });

  it("clamps an event that spans the month boundary to the month", () => {
    const long = {
      startsAt: at("2026-10-30T10:00:00Z"),
      endsAt: at("2026-11-02T10:00:00Z"),
    };
    expect([
      ...eventsByMonthDay([long], "2026-11", "2026-10-01").keys(),
    ]).toEqual(["2026-11-01", "2026-11-02"]);
    expect([
      ...eventsByMonthDay([long], "2026-10", "2026-10-01").keys(),
    ]).toEqual(["2026-10-30", "2026-10-31"]);
  });

  it("does not spill an event ending exactly at midnight onto the next day", () => {
    const evening = {
      startsAt: at("2026-12-05T20:00:00Z"),
      endsAt: at("2026-12-06T00:00:00Z"),
    };
    expect([
      ...eventsByMonthDay([evening], "2026-12", "2026-12-01").keys(),
    ]).toEqual(["2026-12-05"]);
  });

  it("places an open-ended event on its start day only", () => {
    const open = { startsAt: at("2026-11-20T18:00:00Z"), endsAt: null };
    expect([
      ...eventsByMonthDay([open], "2026-11", "2026-11-01").keys(),
    ]).toEqual(["2026-11-20"]);
  });

  it("ignores events outside the month", () => {
    const other = { startsAt: at("2026-12-20T18:00:00Z"), endsAt: null };
    expect(eventsByMonthDay([other], "2026-11", "2026-11-01").size).toBe(0);
  });

  it("lists a running multi-day event only from today onwards", () => {
    const running = {
      startsAt: at("2026-11-10T10:00:00Z"),
      endsAt: at("2026-11-14T16:00:00Z"),
    };
    expect([
      ...eventsByMonthDay([running], "2026-11", "2026-11-12").keys(),
    ]).toEqual(["2026-11-12", "2026-11-13", "2026-11-14"]);
  });

  it("returns nothing for a wholly past month", () => {
    const running = {
      startsAt: at("2026-09-20T10:00:00Z"),
      endsAt: at("2026-11-14T16:00:00Z"),
    };
    expect(eventsByMonthDay([running], "2026-09", "2026-10-19").size).toBe(0);
    expect(
      eventsByMonthDay([running], "2026-10", "2026-10-19").size,
    ).toBeGreaterThan(0);
  });

  it("uses London days around a clock change", () => {
    // 23:30 UTC on 30 June is 00:30 on 1 July in London.
    const late = { startsAt: at("2026-06-30T23:30:00Z"), endsAt: null };
    expect([
      ...eventsByMonthDay([late], "2026-07", "2026-07-01").keys(),
    ]).toEqual(["2026-07-01"]);
  });
});

describe("month URL state", () => {
  it("round-trips the month view and keeps a picked day", () => {
    const filters = parseEventFilters({
      view: "month",
      month: "2026-11",
      day: "2026-11-14",
      q: "fair",
    });
    expect(filters).toMatchObject({
      view: "month",
      month: "2026-11",
      day: "2026-11-14",
      when: null,
    });
    expect(eventsHref(filters)).toBe(
      "/events?q=fair&view=month&month=2026-11&day=2026-11-14",
    );
  });

  it("ignores a month outside the month view and drops a bad month", () => {
    expect(parseEventFilters({ month: "2026-11" }).month).toBeNull();
    expect(
      parseEventFilters({ view: "month", month: "nope" }).month,
    ).toBeNull();
    expect(parseEventFilters({ view: "weird" }).view).toBe("list");
  });

  it("ignores a quick range in the month view", () => {
    expect(parseEventFilters({ view: "month", when: "week" }).when).toBeNull();
  });
});
