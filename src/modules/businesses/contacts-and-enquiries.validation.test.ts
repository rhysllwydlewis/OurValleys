import { describe, expect, it } from "vitest";
import {
  submitBusinessEnquiry,
  validateContactMethodFields,
} from "./contacts-and-enquiries";

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

describe("contact method field validation", () => {
  const valid = {
    type: "email",
    label: "Email us",
    value: "hello@example.com",
    sortOrder: 1,
  };

  it("accepts a valid method", () => {
    expect(validateContactMethodFields(valid)).toEqual({});
  });

  it("points a mismatched value at the value input", () => {
    expect(
      validateContactMethodFields({ ...valid, value: "not an email" }),
    ).toEqual({ value: "Enter an email address, e.g. hello@example.com." });
  });

  it("reports every problem against its own input", () => {
    expect(
      validateContactMethodFields({
        type: "call",
        label: "x",
        value: "abc",
        sortOrder: 99,
      }),
    ).toEqual({
      label: "Use 2 to 50 characters for the button label.",
      sortOrder: "Use a whole number from 0 to 50.",
      value: "Enter a phone number, e.g. 01443 123456.",
    });
  });

  it("rejects an unknown type and a non-numeric order", () => {
    const errors = validateContactMethodFields({
      ...valid,
      type: "carrier-pigeon",
      sortOrder: Number.NaN,
    });
    expect(errors.type).toBe("Choose a contact method.");
    expect(errors.sortOrder).toBeDefined();
    expect(errors.value).toBeUndefined();
  });
});
