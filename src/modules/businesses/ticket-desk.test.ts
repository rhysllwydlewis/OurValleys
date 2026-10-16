import { describe, expect, it } from "vitest";
import {
  actionGuide,
  correctionRows,
  describeEvidence,
  rankTickets,
  summariseTickets,
  ticketCautions,
  type ActionGuideInput,
  type CurrentPublicValues,
} from "./ticket-desk";

const now = new Date("2026-10-16T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);
const current: CurrentPublicValues = {
  publicPhone: "01443 000000",
  publicEmail: null,
  summary: "Old summary",
  description: "Old description",
};

function ticket(
  id: string,
  overrides: Partial<Parameters<typeof rankTickets>[0][number]> = {},
) {
  return {
    id,
    type: "claim" as const,
    status: "open",
    riskLevel: "standard" as const,
    createdAt: hoursAgo(1),
    ...overrides,
  };
}

const baseGuide: ActionGuideInput = {
  type: "claim",
  status: "open",
  resolutionAction: null,
  businessName: "Cwm Coil",
  businessSlug: "cwm-coil",
  relatedBusinessName: null,
  hasRelatedBusiness: false,
  claimantName: "Ann",
  hasClaimant: true,
  claimantAlreadyManages: false,
  currentOwnerCount: 0,
  evidence: null,
  current,
};

describe("rankTickets", () => {
  it("puts high risk first, then overdue, then oldest; paused and closed last", () => {
    const ranked = rankTickets(
      [
        ticket("closed", { status: "resolved", createdAt: hoursAgo(500) }),
        ticket("paused", { status: "awaiting_information" }),
        ticket("fresh", { createdAt: hoursAgo(2) }),
        ticket("overdue", { createdAt: hoursAgo(100) }),
        ticket("risky", { riskLevel: "high", createdAt: hoursAgo(1) }),
        ticket("older", { createdAt: hoursAgo(10) }),
      ],
      now,
    );
    expect(ranked.map((item) => item.id)).toEqual([
      "risky",
      "overdue",
      "older",
      "fresh",
      "paused",
      "closed",
    ]);
    expect(ranked.find((item) => item.id === "overdue")?.urgency).toBe(
      "overdue",
    );
    expect(ranked.find((item) => item.id === "paused")?.urgency).toBeNull();
  });

  it("orders closed tickets newest first", () => {
    const ranked = rankTickets(
      [
        ticket("a", { status: "rejected", createdAt: hoursAgo(50) }),
        ticket("b", { status: "dismissed", createdAt: hoursAgo(5) }),
      ],
      now,
    );
    expect(ranked.map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("summariseTickets", () => {
  it("counts only work still to do", () => {
    const summary = summariseTickets(
      rankTickets(
        [
          ticket("1", { createdAt: hoursAgo(100) }),
          ticket("2", { type: "duplicate", riskLevel: "high" }),
          ticket("3", { status: "awaiting_information", type: "correction" }),
          ticket("4", { status: "approved" }),
        ],
        now,
      ),
    );
    expect(summary).toMatchObject({
      open: 2,
      awaitingInformation: 1,
      overdue: 1,
      highRisk: 1,
    });
    expect(summary.byType).toEqual({
      claim: 1,
      duplicate: 1,
      correction: 1,
      slug_change: 0,
    });
  });
});

describe("describeEvidence", () => {
  it("labels known facts and keeps unknown shapes for the fold-out", () => {
    const described = describeEvidence({
      claimedRole: "Co-owner",
      reportReason: "duplicate_listing",
      website: null,
      changes: { publicPhone: "1" },
      mergedMembershipUserIds: ["x"],
      extraNested: { a: 1 },
      someNewKey: "kept",
    });
    expect(described.rows).toEqual([
      { label: "Claimant says they are", value: "Co-owner" },
      { label: "Report reason", value: "duplicate listing" },
      { label: "Some new key", value: "kept" },
    ]);
    expect(described.other).toEqual({ extraNested: { a: 1 } });
  });

  it("handles a ticket with no evidence", () => {
    expect(describeEvidence(null)).toEqual({ rows: [], other: null });
  });
});

describe("correctionRows", () => {
  it("compares proposed with public values and flags no-ops", () => {
    const rows = correctionRows(
      {
        changes: {
          publicPhone: "01443 123456",
          summary: "Old summary",
          publicEmail: null,
          bogus: "ignored",
        },
      },
      current,
    );
    expect(rows.map((row) => [row.field, row.changes])).toEqual([
      ["publicPhone", true],
      ["publicEmail", false],
      ["summary", false],
    ]);
  });

  it("is empty when the ticket carries no structured changes", () => {
    expect(correctionRows({ reportReason: "x" }, current)).toEqual([]);
    expect(correctionRows({ changes: [1] }, current)).toEqual([]);
  });
});

describe("actionGuide", () => {
  it("offers only the actions the service allows for each type", () => {
    const actions = (input: Partial<ActionGuideInput>) =>
      actionGuide({ ...baseGuide, ...input }).map((option) => option.action);
    expect(actions({})).toEqual([
      "transfer_control",
      "approve_claim",
      "add_manager",
      "request_information",
      "reject",
      "dismiss",
    ]);
    expect(
      actions({
        type: "duplicate",
        hasRelatedBusiness: true,
        relatedBusinessName: "Other",
      }),
    ).toEqual([
      "merge_duplicate",
      "keep_separate",
      "request_information",
      "reject",
      "dismiss",
    ]);
    expect(actions({ type: "correction" })).toContain("accept_correction");
    expect(actions({ type: "slug_change" })).toContain("approve_slug_change");
    expect(actions({ type: "correction" })).not.toContain("approve_claim");
  });

  it("recommends owner transfer only when nobody owns the business", () => {
    const free = actionGuide(baseGuide);
    expect(free.find((o) => o.recommended)?.action).toBe("transfer_control");
    const owned = actionGuide({ ...baseGuide, currentOwnerCount: 1 });
    expect(owned.find((o) => o.recommended)?.action).toBe(
      "request_information",
    );
    expect(
      owned.find((o) => o.action === "transfer_control")?.effects.join(" "),
    ).toContain("The current owner becomes a manager");
  });

  it("blocks claim grants with no account and never suggests them", () => {
    const options = actionGuide({
      ...baseGuide,
      hasClaimant: false,
      claimantName: null,
    });
    for (const action of ["transfer_control", "approve_claim", "add_manager"]) {
      const option = options.find((o) => o.action === action);
      expect(option?.blockedReason).toMatch(/not attached/);
      expect(option?.recommended).toBe(false);
    }
  });

  it("never recommends a destructive merge", () => {
    const options = actionGuide({
      ...baseGuide,
      type: "duplicate",
      hasRelatedBusiness: true,
      relatedBusinessName: "Other",
    });
    expect(options.some((option) => option.recommended)).toBe(false);
    expect(options.find((o) => o.action === "merge_duplicate")?.tone).toBe(
      "danger",
    );
  });

  it("describes each correction and blocks one with nothing to apply", () => {
    const options = actionGuide({
      ...baseGuide,
      type: "correction",
      evidence: { changes: { publicPhone: "01443 123456" } },
    });
    const accept = options.find((o) => o.action === "accept_correction");
    expect(accept?.recommended).toBe(true);
    expect(accept?.effects[0]).toContain(
      "“01443 000000” becomes “01443 123456”",
    );

    const empty = actionGuide({
      ...baseGuide,
      type: "correction",
      evidence: { reportReason: "x" },
    }).find((o) => o.action === "accept_correction");
    expect(empty?.blockedReason).toMatch(/no structured change/);
    expect(empty?.recommended).toBe(false);
  });

  it("blocks a web address change with no valid proposal", () => {
    const option = actionGuide({
      ...baseGuide,
      type: "slug_change",
      evidence: { proposedSlug: "!!!" },
    }).find((o) => o.action === "approve_slug_change");
    expect(option?.blockedReason).toBeTruthy();
    const ok = actionGuide({
      ...baseGuide,
      type: "slug_change",
      evidence: { proposedSlug: "Cwm & Coil" },
    }).find((o) => o.action === "approve_slug_change");
    expect(ok?.effects[0]).toBe("The business page moves to /b/cwm-and-coil.");
  });

  it("offers nothing on a closed ticket except undoing a merge", () => {
    expect(actionGuide({ ...baseGuide, status: "rejected" })).toEqual([]);
    expect(
      actionGuide({
        ...baseGuide,
        type: "duplicate",
        status: "resolved",
        resolutionAction: "keep_separate",
        hasRelatedBusiness: true,
      }),
    ).toEqual([]);
    expect(
      actionGuide({
        ...baseGuide,
        type: "duplicate",
        status: "resolved",
        resolutionAction: "merge_duplicate",
        hasRelatedBusiness: true,
      }).map((o) => o.action),
    ).toEqual(["restore_duplicate"]);
  });
});

describe("ticketCautions", () => {
  const base = {
    type: "claim" as const,
    status: "open",
    hasClaimant: true,
    claimantAlreadyManages: false,
    claimantEmailVerified: true,
    currentOwnerCount: 0,
    otherOpenTicketCount: 0,
  };
  it("is quiet when nothing needs a second look", () => {
    expect(ticketCautions(base)).toEqual([]);
  });
  it("flags conflicts, unverified email and missing accounts", () => {
    expect(
      ticketCautions({
        ...base,
        claimantEmailVerified: false,
        currentOwnerCount: 1,
        otherOpenTicketCount: 2,
      }),
    ).toHaveLength(3);
    expect(ticketCautions({ ...base, hasClaimant: false })[0]).toMatch(
      /no longer exists/,
    );
  });
  it("says nothing about a closed ticket", () => {
    expect(
      ticketCautions({ ...base, status: "approved", currentOwnerCount: 2 }),
    ).toEqual([]);
  });
});
