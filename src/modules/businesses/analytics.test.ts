import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  businessActivityTypes,
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
