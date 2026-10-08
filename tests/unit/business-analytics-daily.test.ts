import { describe, expect, it } from "vitest";
import {
  buildDailySeries,
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
    expect(buildDailySeries([], 9999, now)).toHaveLength(365);
  });

  it("uses the London calendar day around midnight", () => {
    // Clocks go forward on 29 March, so 28 March 23:30 UTC is still 28 March.
    expect(londonDayKey(new Date("2026-03-28T23:30:00Z"))).toBe("2026-03-28");
    // 23:30 UTC on 30 March is 00:30 BST on 31 March.
    expect(londonDayKey(new Date("2026-03-30T23:30:00Z"))).toBe("2026-03-31");
  });
});
