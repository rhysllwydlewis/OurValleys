import { describe, expect, it } from "vitest";
import { buildActiveBusinessesTrend } from "./founder-dashboard";

const NOW = new Date("2026-09-23T12:00:00Z"); // a Wednesday

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

describe("buildActiveBusinessesTrend", () => {
  it("returns one point per week, oldest first, ending on the current week", () => {
    const points = buildActiveBusinessesTrend([], 4, NOW);

    expect(points).toHaveLength(4);
    // 2026-09-21 is the Monday of the current week for a 2026-09-23 "now".
    expect(points[points.length - 1]!.weekStart).toBe("2026-09-21");
    expect(points.map((point) => point.weekStart)).toEqual([
      "2026-08-31",
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
    ]);
  });

  it("buckets each date into its own week and accumulates the running total", () => {
    const points = buildActiveBusinessesTrend(
      [daysAgo(1), daysAgo(2), daysAgo(9), daysAgo(30)],
      4,
      NOW,
    );

    // daysAgo(30) falls entirely outside the 4-week window and should only
    // count toward the carried-forward cumulative total, not a weekly bucket.
    expect(points.every((point) => point.weekStart !== "2026-08-24")).toBe(
      true,
    );

    const currentWeek = points[points.length - 1]!;
    expect(currentWeek.publishedCount).toBe(2); // daysAgo(1) and daysAgo(2)

    const priorWeek = points[points.length - 2]!;
    expect(priorWeek.publishedCount).toBe(1); // daysAgo(9)

    expect(currentWeek.cumulativeTotal).toBe(4);
    expect(priorWeek.cumulativeTotal).toBe(2);
  });

  it("never produces a negative count and totals to the full input length", () => {
    const dates = [
      daysAgo(0),
      daysAgo(3),
      daysAgo(10),
      daysAgo(20),
      daysAgo(45),
    ];
    const points = buildActiveBusinessesTrend(dates, 8, NOW);

    const totalInWindow = points.reduce(
      (sum, point) => sum + point.publishedCount,
      0,
    );
    const finalCumulative = points[points.length - 1]!.cumulativeTotal;

    expect(points.every((point) => point.publishedCount >= 0)).toBe(true);
    expect(finalCumulative).toBe(dates.length);
    expect(totalInWindow).toBeLessThanOrEqual(dates.length);
  });

  it("handles an empty input without throwing", () => {
    const points = buildActiveBusinessesTrend([], 8, NOW);

    expect(points).toHaveLength(8);
    expect(points.every((point) => point.publishedCount === 0)).toBe(true);
    expect(points.every((point) => point.cumulativeTotal === 0)).toBe(true);
  });
});
