import { describe, expect, it } from "vitest";
import {
  formatEnquiriesAsCsv,
  type BusinessEnquiryView,
} from "@/modules/businesses/contacts-and-enquiries";

function enquiry(
  overrides: Partial<BusinessEnquiryView> = {},
): BusinessEnquiryView {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    kind: "enquiry",
    senderName: "Test Sender",
    senderEmail: "sender@example.com",
    senderPhone: null,
    message: "Hello there",
    preferredTime: null,
    status: "new",
    submittedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("formatEnquiriesAsCsv", () => {
  it.each(["=", "+", "-", "@"])(
    "neutralizes a leading %s to prevent formula injection",
    (prefix) => {
      const csv = formatEnquiriesAsCsv([
        enquiry({
          senderName: `${prefix}HYPERLINK("http://evil.example","click")`,
          message: `${prefix}cmd|' /C calc'!A1`,
        }),
      ]);
      const dataRow = csv.split("\r\n")[1];
      expect(dataRow).toContain(`"'${prefix}HYPERLINK`);
      expect(dataRow).toContain(`"'${prefix}cmd|`);
      expect(dataRow).not.toContain(`"${prefix}HYPERLINK`);
    },
  );

  it("leaves ordinary field values untouched", () => {
    const csv = formatEnquiriesAsCsv([
      enquiry({ senderName: "Jane Doe", message: "Just a normal message" }),
    ]);
    const dataRow = csv.split("\r\n")[1];
    expect(dataRow).toContain('"Jane Doe"');
    expect(dataRow).toContain('"Just a normal message"');
  });

  it("still escapes embedded double quotes after sanitizing", () => {
    const csv = formatEnquiriesAsCsv([
      enquiry({ senderName: '=SUM(1,1)"quoted"' }),
    ]);
    const dataRow = csv.split("\r\n")[1];
    expect(dataRow).toContain('"\'=SUM(1,1)""quoted"""');
  });
});
