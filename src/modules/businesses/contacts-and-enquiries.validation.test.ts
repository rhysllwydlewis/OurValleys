import { describe, expect, it } from "vitest";
import { submitBusinessEnquiry } from "./contacts-and-enquiries";

describe("business enquiry validation", () => {
  it("requires at least one reply method before any database work", async () => {
    await expect(
      submitBusinessEnquiry({
        businessId: "00000000-0000-4000-8000-000000000001",
        kind: "enquiry",
        senderName: "Fictional Customer",
        senderEmail: "",
        senderPhone: "",
        message: "Please send information about the fictional test service.",
        preferredTime: "",
        consentAccepted: true,
        website: "",
      }),
    ).resolves.toMatchObject({
      status: "invalid",
      message:
        "Add an email address or telephone number so the business can reply.",
    });
  });

  it("rejects a malformed telephone number before any database work", async () => {
    await expect(
      submitBusinessEnquiry({
        businessId: "00000000-0000-4000-8000-000000000001",
        kind: "callback",
        senderName: "Fictional Customer",
        senderEmail: "",
        senderPhone: "not-a-number",
        message: "Please call about the fictional test service when available.",
        preferredTime: "Weekday afternoon",
        consentAccepted: true,
        website: "",
      }),
    ).resolves.toMatchObject({
      status: "invalid",
      message: "Enter a valid telephone number.",
    });
  });
});
