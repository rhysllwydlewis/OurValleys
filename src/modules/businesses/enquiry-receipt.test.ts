import { describe, expect, it } from "vitest";
import { buildEnquiryReceipt } from "./enquiry-receipt";

describe("buildEnquiryReceipt", () => {
  const base = {
    businessName: "Fictional Bakery",
    kind: "quote" as const,
    message: "x".repeat(900),
    submittedAt: new Date("2026-10-12T09:00:00Z"),
  };

  it("names the business, kind and date, and caps the message", () => {
    const { subject, text } = buildEnquiryReceipt(base);
    expect(subject).toBe("Your quote request to Fictional Bakery");
    expect(text).toContain("Sent: 12 October 2026");
    expect(text).toContain("x".repeat(500));
    expect(text).not.toContain("x".repeat(501));
  });

  it("does not mention private contact details or the inbox", () => {
    const { text } = buildEnquiryReceipt(base);
    expect(text).not.toMatch(/dashboard|inbox|@|tel:/i);
  });
});
