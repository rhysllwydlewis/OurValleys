import { describe, expect, it } from "vitest";
import {
  eventReportReasons,
  reportReasons,
  reviewReportReasons,
  submitEventReportInputSchema,
  submitReportInputSchema,
  submitReviewReportInputSchema,
} from "./content-reports";

const validInput = {
  businessId: "00000000-0000-4000-8000-000000000001",
  reason: "incorrect_details",
  details: "A fictional correction for the directory listing.",
  reporterEmail: "resident@example.test",
  reporterUserId: "00000000-0000-4000-8000-000000000002",
};

const validReviewReportInput = {
  reviewId: "00000000-0000-4000-8000-000000000003",
  reason: "abusive_or_offensive",
  details: "A fictional complaint about this review.",
  reporterEmail: "resident@example.test",
  reporterUserId: "00000000-0000-4000-8000-000000000002",
};

const validEventReportInput = {
  eventId: "00000000-0000-4000-8000-000000000004",
  reason: "incorrect_details",
  details: "A fictional complaint about this event.",
  reporterEmail: "resident@example.test",
  reporterUserId: "00000000-0000-4000-8000-000000000002",
};

describe("submitReportInputSchema", () => {
  it("accepts every declared report reason", () => {
    for (const reason of reportReasons) {
      expect(
        submitReportInputSchema.safeParse({ ...validInput, reason }).success,
      ).toBe(true);
    }
  });

  it("trims details and accepts an explicitly empty reporter email", () => {
    const result = submitReportInputSchema.safeParse({
      ...validInput,
      details: "  A fictional correction.  ",
      reporterEmail: "",
    });

    expect(result.success).toBe(true);
    expect(result.data?.details).toBe("A fictional correction.");
    expect(result.data?.reporterEmail).toBe("");
  });

  it("allows optional reporter fields to be omitted", () => {
    expect(
      submitReportInputSchema.safeParse({
        businessId: validInput.businessId,
        reason: "other",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed business and reporter identifiers", () => {
    expect(
      submitReportInputSchema.safeParse({
        ...validInput,
        businessId: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(
      submitReportInputSchema.safeParse({
        ...validInput,
        reporterUserId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects unsupported reasons and invalid reporter emails", () => {
    expect(
      submitReportInputSchema.safeParse({
        ...validInput,
        reason: "spam",
      }).success,
    ).toBe(false);
    expect(
      submitReportInputSchema.safeParse({
        ...validInput,
        reporterEmail: "not-an-email",
      }).success,
    ).toBe(false);
  });

  it("rejects report details over the maximum length", () => {
    expect(
      submitReportInputSchema.safeParse({
        ...validInput,
        details: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

describe("submitReviewReportInputSchema", () => {
  it("accepts every declared review report reason", () => {
    for (const reason of reviewReportReasons) {
      expect(
        submitReviewReportInputSchema.safeParse({
          ...validReviewReportInput,
          reason,
        }).success,
      ).toBe(true);
    }
  });

  it("allows optional reporter fields to be omitted", () => {
    expect(
      submitReviewReportInputSchema.safeParse({
        reviewId: validReviewReportInput.reviewId,
        reason: "other",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed review identifiers", () => {
    expect(
      submitReviewReportInputSchema.safeParse({
        ...validReviewReportInput,
        reviewId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects a business report reason that isn't a review report reason", () => {
    expect(
      submitReviewReportInputSchema.safeParse({
        ...validReviewReportInput,
        reason: "duplicate_listing",
      }).success,
    ).toBe(false);
  });
});

describe("submitEventReportInputSchema", () => {
  it("accepts every declared event report reason", () => {
    for (const reason of eventReportReasons) {
      expect(
        submitEventReportInputSchema.safeParse({
          ...validEventReportInput,
          reason,
        }).success,
      ).toBe(true);
    }
  });

  it("allows optional reporter fields to be omitted", () => {
    expect(
      submitEventReportInputSchema.safeParse({
        eventId: validEventReportInput.eventId,
        reason: "other",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed event identifiers", () => {
    expect(
      submitEventReportInputSchema.safeParse({
        ...validEventReportInput,
        eventId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  it("rejects a review report reason that isn't an event report reason", () => {
    expect(
      submitEventReportInputSchema.safeParse({
        ...validEventReportInput,
        reason: "abusive_or_offensive",
      }).success,
    ).toBe(false);
  });
});
