import { describe, expect, it } from "vitest";
import {
  buildDailySeries,
  londonDaySpan,
  londonDayKey,
} from "../../src/modules/businesses/analytics";

const now = new Date("2026-03-30T10:00:00Z"); // BST has begun (clocks go forward 29 March)

describe("buildDailySeries", () => {
  it("returns exactly the requested number of consecutive days ending today", () => {
    const series = buildDailySeries([], 7, now);
    expect(series.map((point) => point.date)).toEqual([
      "2026-03-24",
      "2026-03-25",
      "2026-03-26",
      "2026-03-27",
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
    ]);
    expect(
      series.every((p) => p.views + p.contactActions + p.enquiries === 0),
    ).toBe(true);
  });

  it("buckets each activity type and sums contact channels", () => {
    const series = buildDailySeries(
      [
        { day: "2026-03-30", eventType: "website_view", count: 5 },
        { day: "2026-03-30", eventType: "call_click", count: 2 },
        { day: "2026-03-30", eventType: "email_click", count: 1 },
        { day: "2026-03-29", eventType: "enquiry", count: 3 },
        { day: "2026-03-29", eventType: "search_appearance", count: 99 },
      ],
      3,
      now,
    );
    expect(series).toEqual([
      { date: "2026-03-28", views: 0, contactActions: 0, enquiries: 0 },
      { date: "2026-03-29", views: 0, contactActions: 0, enquiries: 3 },
      { date: "2026-03-30", views: 5, contactActions: 3, enquiries: 0 },
    ]);
  });

  it("ignores rows outside the window and clamps the window size", () => {
    const series = buildDailySeries(
      [{ day: "2025-01-01", eventType: "website_view", count: 9 }],
      0,
      now,
    );
    expect(series).toHaveLength(1);
    expect(series[0]!.views).toBe(0);
    expect(buildDailySeries([], 9999, now)).toHaveLength(366);
  });

  it("uses the London calendar day around midnight", () => {
    // Clocks go forward on 29 March, so 28 March 23:30 UTC is still 28 March.
    expect(londonDayKey(new Date("2026-03-28T23:30:00Z"))).toBe("2026-03-28");
    // 23:30 UTC on 30 March is 00:30 BST on 31 March.
    expect(londonDayKey(new Date("2026-03-30T23:30:00Z"))).toBe("2026-03-31");
  });
});

describe("londonDaySpan", () => {
  it("counts the calendar days a rolling window touches, inclusive", () => {
    const end = new Date("2026-06-15T10:00:00Z");
    // Exactly N x 24h earlier lands on an earlier London day than N days ago at midnight.
    expect(londonDaySpan(new Date("2026-06-15T09:00:00Z"), end)).toBe(1);
    expect(londonDaySpan(new Date("2026-06-14T10:00:00Z"), end)).toBe(2);
    expect(londonDaySpan(new Date("2026-05-16T10:00:00Z"), end)).toBe(31);
  });

  it("uses the London day, not the UTC day, around midnight", () => {
    // 23:30 UTC on 14 June is 00:30 BST on 15 June.
    expect(
      londonDaySpan(
        new Date("2026-06-14T23:30:00Z"),
        new Date("2026-06-15T10:00:00Z"),
      ),
    ).toBe(1);
  });

  it("stays correct across the clocks going forward", () => {
    expect(
      londonDaySpan(
        new Date("2026-03-27T12:00:00Z"),
        new Date("2026-03-30T12:00:00Z"),
      ),
    ).toBe(4);
  });
});
