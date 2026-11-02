import { describe, expect, it } from "vitest";
import {
  isUnmetDemandDismissed,
  parseUnmetDemandWindow,
  unmetDemandKey,
} from "./unmet-demand-shared";

describe("parseUnmetDemandWindow", () => {
  it("accepts the offered windows", () => {
    expect(parseUnmetDemandWindow("7")).toBe(7);
    expect(parseUnmetDemandWindow("30")).toBe(30);
    expect(parseUnmetDemandWindow("90")).toBe(90);
  });

  it("falls back to 30 days for anything else", () => {
    expect(parseUnmetDemandWindow(undefined)).toBe(30);
    expect(parseUnmetDemandWindow("")).toBe(30);
    expect(parseUnmetDemandWindow("365")).toBe(30);
    expect(parseUnmetDemandWindow("7; drop table")).toBe(30);
  });
});

describe("unmetDemandKey", () => {
  it("separates rows that differ only in one grouping field", () => {
    const base = { queryText: "bakery", categorySlug: null, placeSlug: null };
    expect(unmetDemandKey(base)).toBe(unmetDemandKey({ ...base }));
    expect(unmetDemandKey({ ...base, placeSlug: "pontypridd" })).not.toBe(
      unmetDemandKey(base),
    );
    expect(unmetDemandKey({ ...base, queryText: null })).not.toBe(
      unmetDemandKey({ ...base, queryText: "null" }),
    );
  });
});

describe("isUnmetDemandDismissed", () => {
  const decided = new Date("2026-10-20T12:00:00Z");

  it("hides a row nobody has searched for since the decision", () => {
    expect(
      isUnmetDemandDismissed(
        { lastSeen: new Date("2026-10-19T00:00:00Z") },
        decided,
      ),
    ).toBe(true);
  });

  it("shows a row again once it is searched after the decision", () => {
    expect(
      isUnmetDemandDismissed(
        { lastSeen: new Date("2026-10-21T00:00:00Z") },
        decided,
      ),
    ).toBe(false);
  });

  it("shows rows that were never dismissed", () => {
    expect(isUnmetDemandDismissed({ lastSeen: decided }, undefined)).toBe(
      false,
    );
  });
});
