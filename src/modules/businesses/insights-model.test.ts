import { describe, expect, it } from "vitest";
import type { BusinessAnalyticsSummary, DailyActivityPoint } from "./analytics";
import {
  buildFunnel,
  buildHighlights,
  buildInsightsCsv,
  buildWeekdayPattern,
  hasAnyActivity,
  busiestWeekday,
  contactRate,
  normaliseClickSurface,
  weekdayIndex,
} from "./insights-model";

function summary(
  overrides: Partial<BusinessAnalyticsSummary> = {},
  byType: Partial<BusinessAnalyticsSummary["byType"]> = {},
): BusinessAnalyticsSummary {
  const base: BusinessAnalyticsSummary = {
    periodDays: 30,
    totalViews: 0,
    searchAppearances: 0,
    qrVisits: 0,
    contactActions: 0,
    enquiries: 0,
    byType: {
      website_view: 0,
      search_appearance: 0,
      call_click: 0,
      email_click: 0,
      enquiry: 0,
      directions_click: 0,
      external_click: 0,
      booking_click: 0,
      order_click: 0,
      qr_visit: 0,
      ...byType,
    },
    previous: {
      totalViews: 0,
      searchAppearances: 0,
      qrVisits: 0,
      contactActions: 0,
      enquiries: 0,
    },
  };
  return { ...base, ...overrides };
}

describe("buildFunnel", () => {
  it("scales bars to the largest step and counts enquiries as getting in touch", () => {
    const steps = buildFunnel({
      searchAppearances: 200,
      totalViews: 100,
      contactActions: 8,
      enquiries: 2,
    });
    expect(
      steps.map((step) => [step.key, step.value, step.barPercent]),
    ).toEqual([
      ["appearances", 200, 100],
      ["views", 100, 50],
      ["contacts", 10, 5],
    ]);
  });

  it("keeps a non-zero step visible and a zero step empty", () => {
    const steps = buildFunnel({
      searchAppearances: 0,
      totalViews: 1000,
      contactActions: 1,
      enquiries: 0,
    });
    expect(steps[0]!.barPercent).toBe(0);
    expect(steps[2]!.barPercent).toBe(2);
  });
});

describe("contactRate", () => {
  it("is a whole percent of visits, capped at 100", () => {
    expect(contactRate(40, 3, 1)).toBe(10);
    // A frequency, not a conversion rate, so it can pass 100.
    expect(contactRate(30, 20, 20)).toBe(133);
  });

  it("is null without enough visits to measure against", () => {
    expect(contactRate(0, 3, 1)).toBeNull();
    expect(contactRate(29, 3, 1)).toBeNull();
  });
});

describe("weekday pattern", () => {
  it("numbers days Monday first", () => {
    expect(weekdayIndex("2026-10-12")).toBe(0); // Monday
    expect(weekdayIndex("2026-10-17")).toBe(5); // Saturday
    expect(weekdayIndex("2026-10-18")).toBe(6); // Sunday
  });

  it("adds views per weekday and finds a single busiest day", () => {
    const rows = buildWeekdayPattern([
      { date: "2026-10-10", views: 4 }, // Saturday
      { date: "2026-10-17", views: 6 }, // Saturday
      { date: "2026-10-12", views: 3 }, // Monday
    ]);
    expect(rows[5]!.views).toBe(10);
    expect(rows[5]!.barPercent).toBe(100);
    expect(rows[0]!.barPercent).toBe(30);
    expect(busiestWeekday(rows)).toBe(5);
  });

  it("names no busiest day when there is a tie or no data", () => {
    expect(
      busiestWeekday(
        buildWeekdayPattern([
          { date: "2026-10-12", views: 3 },
          { date: "2026-10-13", views: 3 },
        ]),
      ),
    ).toBeNull();
    expect(busiestWeekday(buildWeekdayPattern([]))).toBeNull();
  });
});

describe("buildHighlights", () => {
  const weekdays = buildWeekdayPattern([
    { date: "2026-10-17", views: 12 },
    { date: "2026-10-12", views: 2 },
  ]);

  it("says only that it is quiet when there is nothing to report", () => {
    expect(
      buildHighlights({ summary: summary(), sources: [], weekdays: [] }),
    ).toEqual([{ kind: "quiet" }]);
  });

  it("reports patterns that are true of the numbers and stops at four", () => {
    const highlights = buildHighlights({
      summary: summary(
        {
          totalViews: 40,
          contactActions: 6,
          enquiries: 2,
          previous: {
            totalViews: 20,
            searchAppearances: 0,
            qrVisits: 0,
            contactActions: 0,
            enquiries: 0,
          },
        },
        { call_click: 4, email_click: 2 },
      ),
      sources: [{ source: "directory", count: 30, percent: 75 }],
      weekdays,
    });
    expect(highlights.map((highlight) => highlight.kind)).toEqual([
      "views",
      "topSource",
      "busiestDay",
      "topChannel",
    ]);
    expect(highlights[0]).toMatchObject({
      change: { kind: "change", percent: 100 },
    });
    expect(highlights[3]).toMatchObject({ channel: "call_click", count: 4 });
  });

  it("does not call a handful of visits a pattern", () => {
    const highlights = buildHighlights({
      summary: summary({ totalViews: 3 }),
      sources: [{ source: "direct", count: 3, percent: 100 }],
      weekdays,
    });
    expect(highlights.map((highlight) => highlight.kind)).toEqual([]);
  });

  it("points out visits that led to no contact and an unused QR code", () => {
    const highlights = buildHighlights({
      summary: summary({ totalViews: 30 }),
      sources: [],
      weekdays: buildWeekdayPattern([]),
    });
    expect(highlights.map((highlight) => highlight.kind)).toEqual([
      "views",
      "noContact",
      "noQr",
    ]);
  });
});

describe("buildInsightsCsv", () => {
  const daily: DailyActivityPoint[] = [
    { date: "2026-10-16", views: 3, contactActions: 1, enquiries: 0 },
    { date: "2026-10-17", views: 0, contactActions: 0, enquiries: 2 },
  ];

  it("writes a header and one CRLF-terminated line per day", () => {
    expect(buildInsightsCsv(daily)).toBe(
      "date,views,contact_actions,enquiries\r\n2026-10-16,3,1,0\r\n2026-10-17,0,0,2\r\n",
    );
  });

  it("writes only the header when there are no days", () => {
    expect(buildInsightsCsv([])).toBe(
      "date,views,contact_actions,enquiries\r\n",
    );
  });
});

describe("click surfaces", () => {
  it("keeps known page areas and folds everything else to other", () => {
    expect(normaliseClickSurface("offer")).toBe("offer");
    expect(normaliseClickSurface("menu_document")).toBe("menu_document");
    expect(normaliseClickSurface("<script>")).toBe("other");
    expect(normaliseClickSurface("")).toBe("other");
  });
});

describe("hasAnyActivity", () => {
  it("is false when both periods are empty", () => {
    expect(hasAnyActivity(summary())).toBe(false);
  });

  it("counts any metric in this period or the one before", () => {
    expect(hasAnyActivity(summary({ qrVisits: 1 }))).toBe(true);
    const previousOnly = summary();
    previousOnly.previous.searchAppearances = 4;
    expect(hasAnyActivity(previousOnly)).toBe(true);
    const contactsBefore = summary();
    contactsBefore.previous.enquiries = 1;
    expect(hasAnyActivity(contactsBefore)).toBe(true);
  });
});
