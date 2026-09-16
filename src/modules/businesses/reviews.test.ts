import { describe, expect, it } from "vitest";
import { submitReviewInputSchema } from "./reviews";

const validInput = {
  businessId: "00000000-0000-4000-8000-000000000001",
  rating: 5,
  body: "Friendly team and did a great job.",
};

describe("submitReviewInputSchema", () => {
  it("accepts every rating from 1 to 5", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(
        submitReviewInputSchema.safeParse({ ...validInput, rating }).success,
      ).toBe(true);
    }
  });

  it("allows an optional review body to be omitted", () => {
    const result = submitReviewInputSchema.safeParse({
      businessId: validInput.businessId,
      rating: 4,
    });
    expect(result.success).toBe(true);
  });

  it("trims the review body", () => {
    const result = submitReviewInputSchema.safeParse({
      ...validInput,
      body: "  Great service.  ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.body).toBe("Great service.");
  });

  it("rejects a rating of 0 or above 5", () => {
    expect(
      submitReviewInputSchema.safeParse({ ...validInput, rating: 0 }).success,
    ).toBe(false);
    expect(
      submitReviewInputSchema.safeParse({ ...validInput, rating: 6 }).success,
    ).toBe(false);
  });

  it("rejects a non-integer rating", () => {
    expect(
      submitReviewInputSchema.safeParse({ ...validInput, rating: 3.5 }).success,
    ).toBe(false);
  });

  it("rejects a malformed business identifier", () => {
    expect(
      submitReviewInputSchema.safeParse({
        ...validInput,
        businessId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects a review body over the maximum length", () => {
    expect(
      submitReviewInputSchema.safeParse({
        ...validInput,
        body: "a".repeat(2001),
      }).success,
    ).toBe(false);
  });
});
