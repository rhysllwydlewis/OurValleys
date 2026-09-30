import { describe, expect, it } from "vitest";
import {
  ENQUIRY_CLOSED_RETENTION_DAYS,
  ENQUIRY_DEFAULT_RETENTION_MONTHS,
  ENQUIRY_SPAM_RETENTION_DAYS,
  computeEnquiryRetentionExpiry,
} from "@/modules/businesses/contacts-and-enquiries";

const submittedAt = new Date("2026-01-01T00:00:00.000Z");
const referenceDate = new Date("2026-03-10T00:00:00.000Z");

describe("computeEnquiryRetentionExpiry", () => {
  it.each(["new", "read", "replied"] as const)(
    "gives status %s the default retention ceiling from submission",
    (status) => {
      const expiry = computeEnquiryRetentionExpiry(
        status,
        submittedAt,
        referenceDate,
      );
      const expected = new Date(submittedAt);
      expected.setUTCMonth(
        expected.getUTCMonth() + ENQUIRY_DEFAULT_RETENTION_MONTHS,
      );
      expect(expiry.getTime()).toBe(expected.getTime());
    },
  );

  it("shortens retention to 30 days from now when marked spam", () => {
    const expiry = computeEnquiryRetentionExpiry(
      "spam",
      submittedAt,
      referenceDate,
    );
    expect(expiry.getTime()).toBe(
      referenceDate.getTime() + ENQUIRY_SPAM_RETENTION_DAYS * 86_400_000,
    );
  });

  it.each(["closed", "archived"] as const)(
    "shortens retention to a year from now when marked %s",
    (status) => {
      const expiry = computeEnquiryRetentionExpiry(
        status,
        submittedAt,
        referenceDate,
      );
      expect(expiry.getTime()).toBe(
        referenceDate.getTime() + ENQUIRY_CLOSED_RETENTION_DAYS * 86_400_000,
      );
    },
  );

  it("restores the default ceiling when a terminal status is reopened", () => {
    const reopenedAt = new Date("2026-04-01T00:00:00.000Z");
    const expiry = computeEnquiryRetentionExpiry(
      "new",
      submittedAt,
      reopenedAt,
    );
    const expected = new Date(submittedAt);
    expected.setUTCMonth(
      expected.getUTCMonth() + ENQUIRY_DEFAULT_RETENTION_MONTHS,
    );
    expect(expiry.getTime()).toBe(expected.getTime());
  });
});
