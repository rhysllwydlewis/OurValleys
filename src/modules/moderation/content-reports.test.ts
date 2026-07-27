import { describe, expect, it } from "vitest";
import { reportReasons, submitReportInputSchema } from "./content-reports";

const validInput = {
  businessId: "00000000-0000-4000-8000-000000000001",
  reason: "incorrect_details",
  details: "A fictional correction for the directory listing.",
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
