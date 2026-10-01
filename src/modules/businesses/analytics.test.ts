import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  businessActivityTypes,
  defaultAnalyticsPeriodDays,
  describePeriodChange,
  parseAnalyticsPeriod,
  hashVisitorSignal,
  isBusinessActivityType,
} from "./analytics";

describe("isBusinessActivityType", () => {
  it("accepts every declared activity type", () => {
    for (const type of businessActivityTypes) {
      expect(isBusinessActivityType(type)).toBe(true);
    }
  });

  it("rejects values outside the declared set", () => {
    expect(isBusinessActivityType("page_view")).toBe(false);
    expect(isBusinessActivityType("")).toBe(false);
  });
});

describe("hashVisitorSignal", () => {
  it("hashes a trimmed value deterministically with sha256", () => {
    const expected = createHash("sha256").update("192.0.2.1").digest("hex");

    expect(hashVisitorSignal("192.0.2.1")).toBe(expected);
    expect(hashVisitorSignal("  192.0.2.1  ")).toBe(expected);
  });

  it("returns null for empty, whitespace-only, null or undefined input", () => {
    expect(hashVisitorSignal("")).toBeNull();
    expect(hashVisitorSignal("   ")).toBeNull();
    expect(hashVisitorSignal(null)).toBeNull();
    expect(hashVisitorSignal(undefined)).toBeNull();
  });

  it("never leaks the raw visitor signal in its output", () => {
    expect(hashVisitorSignal("192.0.2.1")).not.toContain("192.0.2.1");
  });
});

describe("parseAnalyticsPeriod", () => {
  it("accepts the offered windows", () => {
    expect(parseAnalyticsPeriod("7")).toBe(7);
    expect(parseAnalyticsPeriod("30")).toBe(30);
    expect(parseAnalyticsPeriod("90")).toBe(90);
  });

  it("falls back to the default for anything else", () => {
    expect(parseAnalyticsPeriod(undefined)).toBe(defaultAnalyticsPeriodDays);
    expect(parseAnalyticsPeriod("")).toBe(defaultAnalyticsPeriodDays);
    expect(parseAnalyticsPeriod("1")).toBe(defaultAnalyticsPeriodDays);
    expect(parseAnalyticsPeriod("9999")).toBe(defaultAnalyticsPeriodDays);
    expect(parseAnalyticsPeriod("abc")).toBe(defaultAnalyticsPeriodDays);
  });
});

describe("describePeriodChange", () => {
  it("reports nothing when both periods are empty", () => {
    expect(describePeriodChange(0, 0)).toEqual({ kind: "none" });
  });

  it("avoids a percentage against a zero baseline", () => {
    expect(describePeriodChange(5, 0)).toEqual({ kind: "new", delta: 5 });
  });

  it("reports unchanged counts", () => {
    expect(describePeriodChange(4, 4)).toEqual({ kind: "same" });
  });

  it("reports rises and falls with rounded percentages", () => {
    expect(describePeriodChange(15, 10)).toEqual({
      kind: "change",
      delta: 5,
      percent: 50,
    });
    expect(describePeriodChange(0, 4)).toEqual({
      kind: "change",
      delta: -4,
      percent: -100,
    });
    expect(describePeriodChange(2, 3)).toEqual({
      kind: "change",
      delta: -1,
      percent: -33,
    });
  });
});
