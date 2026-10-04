import { describe, expect, it } from "vitest";
import {
  MAX_EVENT_OCCURRENCES,
  generateEventOccurrences,
} from "@/modules/events/recurrence";

const iso = (date: Date | null) => date?.toISOString() ?? null;

describe("generateEventOccurrences", () => {
  it("returns only the original event for a single occurrence", () => {
    const startsAt = new Date("2026-06-01T18:00:00Z");
    const result = generateEventOccurrences({
      startsAt,
      endsAt: null,
      frequency: "weekly",
      count: 1,
    });
    expect(result).toEqual([{ startsAt, endsAt: null }]);
  });

  it("steps weekly and fortnightly and keeps the duration", () => {
    const weekly = generateEventOccurrences({
      startsAt: new Date("2026-06-02T18:00:00Z"),
      endsAt: new Date("2026-06-02T20:30:00Z"),
      frequency: "weekly",
      count: 3,
    });
    expect(weekly.map((o) => iso(o.startsAt))).toEqual([
      "2026-06-02T18:00:00.000Z",
      "2026-06-09T18:00:00.000Z",
      "2026-06-16T18:00:00.000Z",
    ]);
    expect(iso(weekly[2]!.endsAt)).toBe("2026-06-16T20:30:00.000Z");

    const fortnightly = generateEventOccurrences({
      startsAt: new Date("2026-06-02T18:00:00Z"),
      endsAt: null,
      frequency: "fortnightly",
      count: 3,
    });
    expect(fortnightly.map((o) => iso(o.startsAt))).toEqual([
      "2026-06-02T18:00:00.000Z",
      "2026-06-16T18:00:00.000Z",
      "2026-06-30T18:00:00.000Z",
    ]);
  });

  it("holds the London wall-clock time across the clock changes", () => {
    // Saturday 19:00 GMT before the last-Sunday-of-March change (28 March 2026).
    const spring = generateEventOccurrences({
      startsAt: new Date("2026-03-21T19:00:00Z"),
      endsAt: null,
      frequency: "weekly",
      count: 3,
    });
    expect(spring.map((o) => iso(o.startsAt))).toEqual([
      "2026-03-21T19:00:00.000Z",
      "2026-03-28T19:00:00.000Z",
      "2026-04-04T18:00:00.000Z", // 19:00 BST
    ]);

    // 19:00 BST before the October change (25 October 2026).
    const autumn = generateEventOccurrences({
      startsAt: new Date("2026-10-17T18:00:00Z"),
      endsAt: new Date("2026-10-17T20:00:00Z"),
      frequency: "weekly",
      count: 3,
    });
    expect(autumn.map((o) => iso(o.startsAt))).toEqual([
      "2026-10-17T18:00:00.000Z",
      "2026-10-24T18:00:00.000Z",
      "2026-10-31T19:00:00.000Z", // 19:00 GMT
    ]);
    expect(iso(autumn[2]!.endsAt)).toBe("2026-10-31T21:00:00.000Z");
  });

  it("repeats monthly on the same ordinal weekday", () => {
    // Second Tuesday of the month.
    const result = generateEventOccurrences({
      startsAt: new Date("2026-01-13T19:00:00Z"),
      endsAt: null,
      frequency: "monthly",
      count: 4,
    });
    expect(result.map((o) => iso(o.startsAt))).toEqual([
      "2026-01-13T19:00:00.000Z",
      "2026-02-10T19:00:00.000Z",
      "2026-03-10T19:00:00.000Z",
      "2026-04-14T18:00:00.000Z",
    ]);
  });

  it("falls back to the last weekday when a fifth one does not exist", () => {
    // Fifth Friday of linked months: 29 May 2026 -> June has only four.
    const result = generateEventOccurrences({
      startsAt: new Date("2026-05-29T12:00:00Z"),
      endsAt: null,
      frequency: "monthly",
      count: 2,
    });
    expect(iso(result[1]!.startsAt)).toBe("2026-06-26T12:00:00.000Z");
  });

  it("rolls monthly series over the year boundary", () => {
    const result = generateEventOccurrences({
      startsAt: new Date("2026-11-03T19:00:00Z"),
      endsAt: null,
      frequency: "monthly",
      count: 3,
    });
    expect(result.map((o) => iso(o.startsAt))).toEqual([
      "2026-11-03T19:00:00.000Z",
      "2026-12-01T19:00:00.000Z",
      "2027-01-05T19:00:00.000Z",
    ]);
  });

  it("clamps the count to the cap and to at least one", () => {
    const base = {
      startsAt: new Date("2026-06-01T18:00:00Z"),
      endsAt: null,
      frequency: "weekly" as const,
    };
    expect(generateEventOccurrences({ ...base, count: 500 })).toHaveLength(
      MAX_EVENT_OCCURRENCES,
    );
    expect(generateEventOccurrences({ ...base, count: 0 })).toHaveLength(1);
    expect(
      generateEventOccurrences({ ...base, count: Number.NaN }),
    ).toHaveLength(1);
  });
});
