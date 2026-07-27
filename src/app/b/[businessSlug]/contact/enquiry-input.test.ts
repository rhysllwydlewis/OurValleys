import { describe, expect, it } from "vitest";
import {
  isAutomatedPublicEnquiry,
  normalisePublicEnquiryInput,
} from "./enquiry-input";

describe("public enquiry input", () => {
  it("normalises visitor-entered contact and message fields before persistence", () => {
    expect(
      normalisePublicEnquiryInput({
        businessId: " 00000000-0000-4000-8000-000000000001 ",
        kind: "quote",
        senderName: "  Fictional Customer  ",
        senderEmail: "  Fictional.Customer@EXAMPLE.TEST  ",
        senderPhone: "  01443 000 000  ",
        message: "  Please send a fictional quotation for the test service.  ",
        preferredTime: "  Weekday afternoon  ",
        consentAccepted: true,
      }),
    ).toEqual({
      businessId: "00000000-0000-4000-8000-000000000001",
      kind: "quote",
      senderName: "Fictional Customer",
      senderEmail: "Fictional.Customer@example.test",
      senderPhone: "01443 000 000",
      message: "Please send a fictional quotation for the test service.",
      preferredTime: "Weekday afternoon",
      consentAccepted: true,
      website: "",
    });
  });

  it("uses empty strings for omitted optional fields without changing consent or kind", () => {
    expect(
      normalisePublicEnquiryInput({
        businessId: "00000000-0000-4000-8000-000000000001",
        kind: "callback",
        senderName: "Fictional Customer",
        message: "Please call about the fictional test service.",
        consentAccepted: false,
      }),
    ).toMatchObject({
      kind: "callback",
      senderEmail: "",
      senderPhone: "",
      preferredTime: "",
      consentAccepted: false,
      website: "",
    });
  });

  it.each([
    undefined,
    null,
    [],
    { businessId: null },
    {
      businessId: "00000000-0000-4000-8000-000000000001",
      kind: "enquiry",
      senderName: "Fictional Customer",
      senderEmail: 123,
      message: "Please reply about the fictional test service.",
      consentAccepted: true,
    },
  ])("rejects malformed runtime payload %# without throwing", (input) => {
    expect(normalisePublicEnquiryInput(input)).toBeNull();
  });

  it("preserves and detects any populated honeypot value", () => {
    const input = normalisePublicEnquiryInput({
      businessId: "00000000-0000-4000-8000-000000000001",
      kind: "enquiry",
      senderName: "Automated Visitor",
      senderEmail: "automated@example.test",
      message: "This submission should not reach the enquiry database.",
      consentAccepted: true,
      website: "   ",
    });

    expect(input).not.toBeNull();
    if (!input) throw new Error("Expected a valid automated enquiry input.");

    expect(input.website).toBe("   ");
    expect(isAutomatedPublicEnquiry(input)).toBe(true);
  });
});
