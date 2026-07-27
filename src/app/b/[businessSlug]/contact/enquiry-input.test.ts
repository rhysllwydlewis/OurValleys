import { describe, expect, it } from "vitest";
import { normalisePublicEnquiryInput } from "./enquiry-input";

describe("normalisePublicEnquiryInput", () => {
  it("normalises visitor-entered contact and message fields before persistence", () => {
    expect(
      normalisePublicEnquiryInput({
        businessId: " 00000000-0000-4000-8000-000000000001 ",
        kind: "quote",
        senderName: "  Fictional Customer  ",
        senderEmail: "  FICTIONAL.CUSTOMER@EXAMPLE.TEST  ",
        senderPhone: "  01443 000 000  ",
        message: "  Please send a fictional quotation for the test service.  ",
        preferredTime: "  Weekday afternoon  ",
        consentAccepted: true,
        website: "   ",
      }),
    ).toEqual({
      businessId: "00000000-0000-4000-8000-000000000001",
      kind: "quote",
      senderName: "Fictional Customer",
      senderEmail: "fictional.customer@example.test",
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
});
