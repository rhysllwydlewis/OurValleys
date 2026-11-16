import { describe, expect, it } from "vitest";
import {
  buildDetailsFreshness,
  isFreshnessGroup,
  type DetailsFreshnessInput,
} from "./details-freshness-model";

const now = new Date("2026-11-16T12:00:00Z");
const rules = { ageingAfterMonths: 6, graceDays: 60 };

const input = (
  id: string,
  overrides: Partial<DetailsFreshnessInput> = {},
): DetailsFreshnessInput => ({
  id,
  tradingName: id,
  lastConfirmedAt: new Date("2026-10-01T00:00:00Z"),
  nextConfirmationDueAt: new Date("2027-10-01T00:00:00Z"),
  staleAt: null,
  ...overrides,
});

describe("buildDetailsFreshness", () => {
  it("counts a recent confirmation as fresh and lists nothing", () => {
    const result = buildDetailsFreshness([input("fresh")], now, rules);
    expect(result.rows).toEqual([]);
    expect(result).toMatchObject({ fresh: 1, total: 1 });
    expect(result.counts).toEqual({ overdue: 0, ageing: 0, never: 0 });
  });

  it("applies the ageing cutoff at exactly the threshold", () => {
    const result = buildDetailsFreshness(
      [
        input("on-cutoff", {
          lastConfirmedAt: new Date("2026-05-16T12:00:00Z"),
        }),
        input("just-inside", {
          lastConfirmedAt: new Date("2026-05-16T12:00:01Z"),
        }),
      ],
      now,
      rules,
    );
    expect(result.rows.map((row) => row.id)).toEqual(["on-cutoff"]);
    expect(result.rows[0]?.group).toBe("ageing");
    expect(result.fresh).toBe(1);
  });

  it("groups a listing with no lifecycle record as never confirmed", () => {
    const result = buildDetailsFreshness(
      [input("never", { lastConfirmedAt: null, nextConfirmationDueAt: null })],
      now,
      rules,
    );
    expect(result.rows[0]).toMatchObject({
      group: "never",
      lastConfirmedAt: null,
      unpublishesAt: null,
    });
  });

  it("treats a lapsed due date as overdue even before the job marks it stale", () => {
    const result = buildDetailsFreshness(
      [
        input("lapsed", {
          lastConfirmedAt: new Date("2025-11-01T00:00:00Z"),
          nextConfirmationDueAt: new Date("2026-11-01T00:00:00Z"),
        }),
      ],
      now,
      rules,
    );
    expect(result.rows[0]).toMatchObject({
      group: "overdue",
      unpublishesAt: null,
    });
  });

  it("gives a stale listing its unpublish date from the grace period", () => {
    const result = buildDetailsFreshness(
      [
        input("stale", {
          lastConfirmedAt: new Date("2025-10-01T00:00:00Z"),
          nextConfirmationDueAt: new Date("2026-10-01T00:00:00Z"),
          staleAt: new Date("2026-10-02T00:00:00Z"),
        }),
      ],
      now,
      rules,
    );
    expect(result.rows[0]?.unpublishesAt?.toISOString()).toBe(
      "2026-12-01T00:00:00.000Z",
    );
  });

  it("ignores a stale mark dated in the future", () => {
    const result = buildDetailsFreshness(
      [input("future", { staleAt: new Date("2026-12-01T00:00:00Z") })],
      now,
      rules,
    );
    expect(result.rows).toEqual([]);
  });

  it("orders overdue first by soonest unpublish, then oldest confirmation, then never", () => {
    const result = buildDetailsFreshness(
      [
        input("never-b", { lastConfirmedAt: null }),
        input("ageing-newer", {
          lastConfirmedAt: new Date("2026-04-01T00:00:00Z"),
        }),
        input("overdue-later", {
          nextConfirmationDueAt: new Date("2026-11-01T00:00:00Z"),
          staleAt: new Date("2026-11-02T00:00:00Z"),
        }),
        input("never-a", { lastConfirmedAt: null }),
        input("ageing-older", {
          lastConfirmedAt: new Date("2026-02-01T00:00:00Z"),
        }),
        input("overdue-sooner", {
          nextConfirmationDueAt: new Date("2026-10-01T00:00:00Z"),
          staleAt: new Date("2026-10-02T00:00:00Z"),
        }),
        input("overdue-unmarked", {
          nextConfirmationDueAt: new Date("2026-11-15T00:00:00Z"),
        }),
        input("fresh"),
      ],
      now,
      rules,
    );
    expect(result.rows.map((row) => row.id)).toEqual([
      "overdue-sooner",
      "overdue-later",
      "overdue-unmarked",
      "ageing-older",
      "ageing-newer",
      "never-a",
      "never-b",
    ]);
    expect(result.counts).toEqual({ overdue: 3, ageing: 2, never: 2 });
    expect(result).toMatchObject({ fresh: 1, total: 8 });
  });
});

describe("isFreshnessGroup", () => {
  it("accepts only the known groups", () => {
    expect(isFreshnessGroup("overdue")).toBe(true);
    expect(isFreshnessGroup("fresh")).toBe(false);
    expect(isFreshnessGroup("")).toBe(false);
  });
});
