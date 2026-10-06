import { describe, expect, it } from "vitest";
import { enquiryWaitingDays } from "@/modules/businesses/contacts-and-enquiries";

const now = new Date("2026-10-10T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("enquiryWaitingDays", () => {
  it("counts whole days for new and read enquiries", () => {
    expect(
      enquiryWaitingDays({ status: "new", submittedAt: daysAgo(4.5) }, now),
    ).toBe(4);
    expect(
      enquiryWaitingDays({ status: "read", submittedAt: daysAgo(1) }, now),
    ).toBe(1);
    expect(
      enquiryWaitingDays({ status: "new", submittedAt: daysAgo(0.2) }, now),
    ).toBe(0);
  });

  it("returns null once an enquiry has been handled", () => {
    for (const status of ["replied", "closed", "archived", "spam"] as const) {
      expect(
        enquiryWaitingDays({ status, submittedAt: daysAgo(10) }, now),
      ).toBeNull();
    }
  });

  it("never returns a negative number for a future timestamp", () => {
    expect(
      enquiryWaitingDays({ status: "new", submittedAt: daysAgo(-2) }, now),
    ).toBe(0);
  });
});
