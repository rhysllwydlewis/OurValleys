import { describe, expect, it } from "vitest";
import { areReviewsEnabled } from "@/lib/reviews-flag";

describe("areReviewsEnabled", () => {
  it('is off unless the switch is exactly "true"', () => {
    expect(areReviewsEnabled(undefined)).toBe(false);
    expect(areReviewsEnabled("")).toBe(false);
    expect(areReviewsEnabled("false")).toBe(false);
    expect(areReviewsEnabled("TRUE")).toBe(false);
    expect(areReviewsEnabled("1")).toBe(false);
    expect(areReviewsEnabled("true")).toBe(true);
  });
});
