import { describe, expect, it } from "vitest";
import { countEventsByDay, groupEventsByDay, isHappeningNow } from "./agenda";
import {
  londonDayKey,
  londonDayKeyAfter,
  parseEventDay,
  resolveEventDayWindow,
  resolveEventWindow,
} from "./date-window";
import {
  activeEventFilterCount,
  eventsFeedQuery,
  eventsHref,
  parseEventFilters,
  withEventFilters,
} from "./event-filters";

const at = (iso: string) => new Date(iso);
// Wednesday 14 January 2026, 10:00 in London (GMT).
const now = at("2026-01-14T10:00:00Z");

describe("london day helpers", () => {
  it("keys an instant by its London day, across the evening clock change", () => {
    expect(londonDayKey(at("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
    expect(londonDayKey(at("2026-01-01T23:30:00Z"))).toBe("2026-01-01");
  });

  it("adds days by calendar, not by 24-hour blocks", () => {
    expect(londonDayKeyAfter(at("2026-03-28T12:00:00Z"), 2)).toBe("2026-03-30");
    expect(londonDayKeyAfter(now, 0)).toBe("2026-01-14");
    expect(londonDayKeyAfter(at("2026-12-30T12:00:00Z"), 3)).toBe("2027-01-02");
  });

  it("accepts only real calendar days", () => {
    expect(parseEventDay("2026-02-28")).toBe("2026-02-28");
    expect(parseEventDay("2026-02-30")).toBeNull();
    expect(parseEventDay("2026-2-3")).toBeNull();
    expect(parseEventDay("tomorrow")).toBeNull();
    expect(parseEventDay(undefined)).toBeNull();
    expect(parseEventDay("2026-13-01")).toBeNull();
  });

  it("starts today's window at now and a later day's at its midnight", () => {
    expect(resolveEventDayWindow("2026-01-14", now).from).toEqual(now);
    const later = resolveEventDayWindow("2026-07-02", now);
    expect(later.from.toISOString()).toBe("2026-07-01T23:00:00.000Z");
    expect(later.to.toISOString()).toBe("2026-07-02T23:00:00.000Z");
  });

  it("makes a thirty-day window", () => {
    const window = resolveEventWindow("month", now);
    expect(window.from).toEqual(now);
    expect(window.to.toISOString()).toBe("2026-02-13T00:00:00.000Z");
  });
});

describe("groupEventsByDay", () => {
  const event = (startsAt: string, endsAt: string | null = null) => ({
    startsAt: at(startsAt),
    endsAt: endsAt ? at(endsAt) : null,
  });

  it("labels today and tomorrow and orders the days", () => {
    const groups = groupEventsByDay(
      [
        event("2026-01-14T18:00:00Z"),
        event("2026-01-14T19:00:00Z"),
        event("2026-01-15T09:00:00Z"),
        event("2026-01-20T09:00:00Z"),
      ],
      now,
    );
    expect(groups.map((group) => [group.dayKey, group.kind])).toEqual([
      ["2026-01-14", "today"],
      ["2026-01-15", "tomorrow"],
      ["2026-01-20", "date"],
    ]);
    expect(groups[0]?.events).toHaveLength(2);
  });

  it("keeps a running multi-day event under today and marks it happening now", () => {
    const groups = groupEventsByDay(
      [event("2026-01-12T09:00:00Z", "2026-01-16T17:00:00Z")],
      now,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.dayKey).toBe("2026-01-14");
    expect(groups[0]?.events[0]?.happeningNow).toBe(true);
  });

  it("anchors running events to the chosen day instead", () => {
    const groups = groupEventsByDay(
      [event("2026-01-12T09:00:00Z", "2026-01-16T17:00:00Z")],
      now,
      "2026-01-15",
    );
    expect(groups[0]?.dayKey).toBe("2026-01-15");
    expect(groups[0]?.kind).toBe("tomorrow");
    expect(groups[0]?.events[0]?.happeningNow).toBe(false);
  });

  it("returns nothing for no events", () => {
    expect(groupEventsByDay([], now)).toEqual([]);
  });

  it("treats an open-ended event as running for two hours", () => {
    const open = event("2026-01-14T09:00:00Z");
    expect(isHappeningNow(open, now)).toBe(true);
    expect(isHappeningNow(open, at("2026-01-14T11:30:00Z"))).toBe(false);
    expect(isHappeningNow(event("2026-01-14T12:00:00Z"), now)).toBe(false);
  });
});

describe("countEventsByDay", () => {
  it("counts an event on every day it overlaps and ignores events beyond the strip", () => {
    const counts = countEventsByDay(
      [
        {
          startsAt: at("2026-01-17T10:00:00Z"),
          endsAt: at("2026-01-18T16:00:00Z"),
        },
        { startsAt: at("2026-01-17T12:00:00Z"), endsAt: null },
        { startsAt: at("2026-03-01T12:00:00Z"), endsAt: null },
      ],
      now,
      14,
    );
    expect(counts).toHaveLength(14);
    expect(counts[0]).toEqual({ dayKey: "2026-01-14", count: 0 });
    expect(counts.find((c) => c.dayKey === "2026-01-17")?.count).toBe(2);
    expect(counts.find((c) => c.dayKey === "2026-01-18")?.count).toBe(1);
    expect(counts.reduce((sum, c) => sum + c.count, 0)).toBe(3);
  });

  it("does not count an event on the day it ends exactly at midnight", () => {
    // Ends 00:00 on 15 January London time, so it belongs to the 14th only.
    const counts = countEventsByDay(
      [
        {
          startsAt: at("2026-01-14T20:00:00Z"),
          endsAt: at("2026-01-15T00:00:00Z"),
        },
      ],
      now,
      3,
    );
    expect(counts.map((c) => c.count)).toEqual([1, 0, 0]);
  });

  it("does not count an event that finished earlier today", () => {
    const counts = countEventsByDay(
      [
        {
          startsAt: at("2026-01-14T07:00:00Z"),
          endsAt: at("2026-01-14T08:00:00Z"),
        },
      ],
      now,
      3,
    );
    expect(counts[0]?.count).toBe(0);
  });
});

describe("event filters", () => {
  it("round-trips every filter through the URL", () => {
    const filters = parseEventFilters({
      q: "carnival",
      category: "food",
      place: "tonypandy",
      when: "weekend",
      page: "3",
    });
    expect(filters).toMatchObject({ when: "weekend", day: null, page: 3 });
    expect(eventsHref(filters)).toBe(
      "/events?q=carnival&category=food&place=tonypandy&when=weekend&page=3",
    );
  });

  it("lets a picked day win over a quick range and drops garbage", () => {
    const filters = parseEventFilters({
      day: "2026-01-17",
      when: "today",
      page: "-4",
    });
    expect(filters).toMatchObject({ day: "2026-01-17", when: null, page: 1 });
    expect(parseEventFilters({ day: "2026-02-30" }).day).toBeNull();
    expect(parseEventFilters({ when: "never" }).when).toBeNull();
  });

  it("omits defaults and resets paging when a filter changes", () => {
    const filters = parseEventFilters({ q: "x", page: "4" });
    expect(eventsHref({})).toBe("/events");
    expect(eventsHref(withEventFilters(filters, { when: "today" }))).toBe(
      "/events?q=x&when=today",
    );
  });

  it("keeps the filters in paging links and the feed leaves out a picked day", () => {
    const filters = parseEventFilters({ when: "week", q: "a b" });
    expect(eventsHref({ ...filters, page: 2 })).toBe(
      "/events?q=a+b&when=week&page=2",
    );
    expect(
      eventsFeedQuery(parseEventFilters({ day: "2026-01-17", q: "x" })),
    ).toBe("?q=x");
    expect(eventsFeedQuery({})).toBe("");
  });

  it("truncates long values and counts active filters", () => {
    expect(parseEventFilters({ q: "a".repeat(200) }).q).toHaveLength(80);
    expect(
      activeEventFilterCount(parseEventFilters({ q: "x", day: "2026-01-17" })),
    ).toBe(2);
    expect(activeEventFilterCount(parseEventFilters({}))).toBe(0);
  });
});

describe("formatDayHeading", () => {
  it("adds the year only for a day in another year", async () => {
    const { formatDayHeading } = await import("./format");
    expect(formatDayHeading("2026-01-17", "en-GB", "2026-01-14")).toBe(
      "Saturday 17 January",
    );
    expect(formatDayHeading("2099-02-14", "en-GB", "2026-01-14")).toMatch(
      /^Saturday,? 14 February 2099$/,
    );
  });
});
