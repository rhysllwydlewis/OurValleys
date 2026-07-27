import { describe, expect, it } from "vitest";
import { submitBusinessEnquiry } from "./contacts-and-enquiries";

describe("business enquiry validation", () => {
  it("requires at least one reply method before any database work", async () => {
    const input = {
      businessId: "00000000-0000-4000-8000-000000000001",
      kind: "enquiry" as const,
      senderName: "Fictional Customer",
      senderEmail: "",
      senderPhone: "",
      message: "Please send information about the fictional test service.",
      preferredTime: "",
      consentAccepted: true as const,
      website: "",
      visitorHash: null,
    };

    await expect(submitBusinessEnquiry(input)).resolves.toMatchObject({
      status: "invalid",
      message:
        "Add an email address or telephone number so the business can reply.",
    });
  });

  it("rejects a malformed telephone number before any database work", async () => {
    const input = {
      businessId: "00000000-0000-4000-8000-000000000001",
      kind: "callback" as const,
      senderName: "Fictional Customer",
      senderEmail: "",
      senderPhone: "not-a-number",
      message: "Please call about the fictional test service when available.",
      preferredTime: "Weekday afternoon",
      consentAccepted: true as const,
      website: "",
      visitorHash: null,
    };

    await expect(submitBusinessEnquiry(input)).resolves.toMatchObject({
      status: "invalid",
      message: "Enter a valid telephone number.",
    });
  });
});
