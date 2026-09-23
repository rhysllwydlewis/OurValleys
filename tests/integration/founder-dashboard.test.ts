import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase } from "@/lib/database/client";
import { getFounderDashboardSummary } from "@/modules/platform/founder-dashboard";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

describeDatabase("founder dashboard summary", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("aggregates activity, coverage and the active-businesses trend", async () => {
    const summary = await getFounderDashboardSummary();

    expect(summary.activity.periodDays).toBe(30);
    expect(summary.activity.searchAppearances).toBeGreaterThanOrEqual(0);
    expect(summary.activity.connections).toBeGreaterThanOrEqual(0);

    expect(summary.activeBusinessesTrend).toHaveLength(8);
    for (const point of summary.activeBusinessesTrend) {
      expect(point.publishedCount).toBeGreaterThanOrEqual(0);
      expect(point.cumulativeTotal).toBeGreaterThanOrEqual(0);
    }
    // Cumulative total is non-decreasing week over week.
    for (
      let index = 1;
      index < summary.activeBusinessesTrend.length;
      index += 1
    ) {
      expect(
        summary.activeBusinessesTrend[index]!.cumulativeTotal,
      ).toBeGreaterThanOrEqual(
        summary.activeBusinessesTrend[index - 1]!.cumulativeTotal,
      );
    }
  });

  it("surfaces the reference-data seed's overwhelming majority of places with zero published businesses first", async () => {
    const summary = await getFounderDashboardSummary();

    expect(summary.coverage.emptiestPlaces.length).toBeGreaterThan(0);
    expect(summary.coverage.emptiestCategories.length).toBeGreaterThan(0);

    // With only a handful of fixture businesses seeded against dozens of
    // real RCT places/categories, the emptiest entries should be genuinely
    // empty, and the list should stay sorted ascending by count.
    expect(summary.coverage.emptiestPlaces[0]!.publishedCount).toBe(0);
    expect(summary.coverage.emptiestCategories[0]!.publishedCount).toBe(0);

    for (
      let index = 1;
      index < summary.coverage.emptiestPlaces.length;
      index += 1
    ) {
      expect(
        summary.coverage.emptiestPlaces[index]!.publishedCount,
      ).toBeGreaterThanOrEqual(
        summary.coverage.emptiestPlaces[index - 1]!.publishedCount,
      );
    }
  });
});
