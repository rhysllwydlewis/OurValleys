import { describe, expect, it } from "vitest";
import {
  businessToDeskItem,
  filterReviewDeskItems,
  formatAge,
  parseReviewDeskFilter,
  rankReviewDeskItems,
  reportToDeskItem,
  responseTargetHours,
  reviewDeskHref,
  suggestionToDeskItem,
  summariseReviewDesk,
  ticketToDeskItem,
  urgencyFor,
  type ReviewDeskItem,
} from "./review-desk";

const now = new Date("2026-10-13T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

function item(overrides: Partial<ReviewDeskItem> = {}): ReviewDeskItem {
  return {
    id: "suggestion:1",
    kind: "suggestion",
    title: "t",
    summary: "s",
    tags: [],
    risk: "standard",
    createdAt: hoursAgo(1),
    href: "/admin/suggestions",
    quickAction: null,
    ...overrides,
  };
}

describe("urgencyFor", () => {
  it("moves through on track, due soon and overdue at 75% and 100% of target", () => {
    expect(urgencyFor("ticket", "standard", 10)).toBe("on_track");
    expect(urgencyFor("ticket", "standard", 54)).toBe("due_soon");
    expect(urgencyFor("ticket", "standard", 72)).toBe("overdue");
  });

  it("holds high-risk work to 24 hours whatever the kind", () => {
    expect(responseTargetHours("suggestion", "high")).toBe(24);
    expect(urgencyFor("suggestion", "high", 25)).toBe("overdue");
  });
});

describe("rankReviewDeskItems", () => {
  it("puts high risk first, then overdue, then kind, then age", () => {
    const ranked = rankReviewDeskItems(
      [
        item({ id: "suggestion:new", createdAt: hoursAgo(2) }),
        item({
          id: "suggestion:old",
          createdAt: hoursAgo(200),
        }),
        item({
          id: "report:fresh",
          kind: "report",
          createdAt: hoursAgo(2),
        }),
        item({
          id: "ticket:risky",
          kind: "ticket",
          risk: "high",
          createdAt: hoursAgo(1),
        }),
      ],
      now,
    );
    expect(ranked.map((entry) => entry.id)).toEqual([
      "ticket:risky",
      "suggestion:old",
      "report:fresh",
      "suggestion:new",
    ]);
  });

  it("is stable for identical items and never mutates its input", () => {
    const input = [
      item({ id: "suggestion:b", createdAt: hoursAgo(5) }),
      item({ id: "suggestion:a", createdAt: hoursAgo(5) }),
    ];
    const copy = [...input];
    const ranked = rankReviewDeskItems(input, now);
    expect(ranked.map((entry) => entry.id)).toEqual([
      "suggestion:a",
      "suggestion:b",
    ]);
    expect(input).toEqual(copy);
  });

  it("treats a future timestamp as zero hours old", () => {
    const [entry] = rankReviewDeskItems(
      [item({ createdAt: hoursAgo(-5) })],
      now,
    );
    expect(entry?.ageHours).toBe(0);
    expect(entry?.urgency).toBe("on_track");
  });
});

describe("filters and summary", () => {
  const ranked = rankReviewDeskItems(
    [
      item({ id: "suggestion:1", createdAt: hoursAgo(200) }),
      item({ id: "report:1", kind: "report", createdAt: hoursAgo(1) }),
      item({ id: "ticket:1", kind: "ticket", risk: "high" }),
    ],
    now,
  );

  it("parses filters defensively", () => {
    expect(
      parseReviewDeskFilter({ kind: "report", urgency: "overdue" }),
    ).toEqual({ kind: "report", urgency: "overdue" });
    expect(
      parseReviewDeskFilter({ kind: "<script>", urgency: ["x", "overdue"] }),
    ).toEqual({ kind: null, urgency: null });
    expect(parseReviewDeskFilter({ kind: ["ticket", "report"] }).kind).toBe(
      "ticket",
    );
  });

  it("filters by kind and urgency together", () => {
    expect(
      filterReviewDeskItems(ranked, { kind: "suggestion", urgency: "overdue" }),
    ).toHaveLength(1);
    expect(
      filterReviewDeskItems(ranked, { kind: "report", urgency: "overdue" }),
    ).toHaveLength(0);
    expect(
      filterReviewDeskItems(ranked, { kind: null, urgency: null }),
    ).toHaveLength(3);
  });

  it("summarises totals, overdue and high risk", () => {
    expect(summariseReviewDesk(ranked)).toEqual({
      total: 3,
      overdue: 1,
      highRisk: 1,
      byKind: { business: 0, ticket: 1, report: 1, suggestion: 1 },
    });
  });

  it("builds short, stable filter links", () => {
    expect(reviewDeskHref({})).toBe("/admin/queue");
    expect(reviewDeskHref({ kind: "ticket", urgency: "overdue" })).toBe(
      "/admin/queue?kind=ticket&urgency=overdue",
    );
  });
});

describe("adapters", () => {
  it("flags high-risk tickets and clips long reasons", () => {
    const result = ticketToDeskItem({
      id: "t1",
      businessName: "Cwm Coil",
      relatedBusinessName: "Cwm Boilers",
      type: "duplicate",
      reason: "x".repeat(400),
      riskLevel: "high",
      createdAt: hoursAgo(3),
    });
    expect(result.risk).toBe("high");
    expect(result.summary.length).toBeLessThanOrEqual(220);
    expect(result.tags).toContain("Related: Cwm Boilers");
    expect(result.quickAction).toBeNull();
  });

  it("treats abusive or inappropriate reports as high risk and offers quick actions", () => {
    const abusive = reportToDeskItem({
      id: "r1",
      targetType: "review",
      businessTradingName: "Cwm Coil",
      eventTitle: null,
      reason: "abusive_or_offensive",
      details: null,
      createdAt: hoursAgo(1),
    });
    expect(abusive.risk).toBe("high");
    expect(abusive.summary).toBe("No further details were given.");
    expect(abusive.quickAction).toEqual({ kind: "report", id: "r1" });
    const wrongDetails = reportToDeskItem({
      id: "r2",
      targetType: "business",
      businessTradingName: "Cwm Coil",
      eventTitle: null,
      reason: "incorrect_details",
      details: "Wrong phone",
      createdAt: hoursAgo(1),
    });
    expect(wrongDetails.risk).toBe("standard");
  });

  it("describes suggestions and repeat suggestions", () => {
    const result = suggestionToDeskItem({
      id: "s1",
      name: "Caffi Cwm",
      placeText: "Tonypandy",
      categoryText: "Café",
      note: null,
      sameCount: 3,
      createdAt: hoursAgo(1),
    });
    expect(result.title).toBe("Caffi Cwm in Tonypandy");
    expect(result.tags).toContain("Suggested 3 times");
  });

  it("dates a pending business from its submission, else its last update", () => {
    const submitted = new Date("2026-10-01T00:00:00Z");
    const updated = new Date("2026-10-05T00:00:00Z");
    const base = {
      id: "b1",
      tradingName: "Home Tutoring",
      categoryName: "Education",
      isDemo: true,
      updatedAt: updated,
    };
    expect(
      businessToDeskItem({ ...base, submittedAt: submitted }).createdAt,
    ).toBe(submitted);
    const fallback = businessToDeskItem({ ...base, submittedAt: null });
    expect(fallback.createdAt).toBe(updated);
    expect(fallback.tags).toContain("Demonstration");
    expect(fallback.href).toBe("/admin/businesses/b1");
  });
});

describe("formatAge", () => {
  it("reads naturally", () => {
    expect(formatAge(0.2)).toBe("Under 1h");
    expect(formatAge(5.9)).toBe("5h");
    expect(formatAge(50)).toBe("2d");
  });
});
