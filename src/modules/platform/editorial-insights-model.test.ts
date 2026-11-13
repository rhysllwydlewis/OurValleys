import { describe, expect, it } from "vitest";
import {
  buildSourceRows,
  fillDailySeries,
  isEditorialKind,
  normaliseEditorialSource,
  parseEditorialWindow,
  withBarPercent,
} from "./editorial-insights-model";

describe("editorial insights model", () => {
  it("accepts only the three kinds and the three windows", () => {
    expect(isEditorialKind("guide")).toBe(true);
    expect(isEditorialKind("offer")).toBe(false);
    expect(isEditorialKind(undefined)).toBe(false);
    expect(parseEditorialWindow("7")).toBe(7);
    expect(parseEditorialWindow("90")).toBe(90);
    expect(parseEditorialWindow("365")).toBe(30);
    expect(parseEditorialWindow("abc")).toBe(30);
    expect(parseEditorialWindow(undefined)).toBe(30);
  });

  it("folds unknown sources onto direct", () => {
    expect(normaliseEditorialSource("QR")).toBe("qr");
    expect(normaliseEditorialSource(" whats_on ")).toBe("whats_on");
    expect(normaliseEditorialSource("https://evil.example/?x=1")).toBe(
      "direct",
    );
    expect(normaliseEditorialSource(undefined)).toBe("direct");
  });

  it("scales bars to the busiest row without hiding a small one", () => {
    expect(
      withBarPercent([{ views: 100 }, { views: 1 }, { views: 0 }]).map(
        (row) => row.barPercent,
      ),
    ).toEqual([100, 4, 0]);
    expect(withBarPercent([{ views: 0 }])[0]?.barPercent).toBe(0);
  });

  it("zero-fills a daily series across a month boundary, oldest first", () => {
    const series = fillDailySeries(
      new Map([["2026-03-01", 4]]),
      "2026-03-02",
      4,
    );
    expect(series).toEqual([
      { date: "2026-02-27", views: 0 },
      { date: "2026-02-28", views: 0 },
      { date: "2026-03-01", views: 4 },
      { date: "2026-03-02", views: 0 },
    ]);
  });

  it("orders sources by opens and computes shares", () => {
    expect(
      buildSourceRows([
        { source: "direct", views: 1 },
        { source: "home", views: 3 },
      ]),
    ).toEqual([
      { source: "home", views: 3, percent: 75 },
      { source: "direct", views: 1, percent: 25 },
    ]);
    expect(buildSourceRows([])).toEqual([]);
  });
});
