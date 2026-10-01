import { describe, expect, it } from "vitest";
import {
  addDaysToDateString,
  londonDateString,
  toPublicOpeningException,
} from "@/modules/businesses/opening-hours-exceptions";

describe("londonDateString", () => {
  it("uses the London calendar date, not UTC", () => {
    // 23:30 UTC on 1 July is 00:30 BST on 2 July.
    expect(londonDateString(new Date("2026-07-01T23:30:00Z"))).toBe(
      "2026-07-02",
    );
    // In winter London matches UTC.
    expect(londonDateString(new Date("2026-12-25T23:30:00Z"))).toBe(
      "2026-12-25",
    );
  });

  it("handles the clocks-change days", () => {
    // Clocks go forward at 01:00 UTC on 29 March 2026.
    expect(londonDateString(new Date("2026-03-29T00:59:00Z"))).toBe(
      "2026-03-29",
    );
    expect(londonDateString(new Date("2026-03-29T23:30:00Z"))).toBe(
      "2026-03-30",
    );
    // Clocks go back at 01:00 UTC on 25 October 2026.
    expect(londonDateString(new Date("2026-10-24T23:30:00Z"))).toBe(
      "2026-10-25",
    );
    expect(londonDateString(new Date("2026-10-25T23:30:00Z"))).toBe(
      "2026-10-25",
    );
  });
});

describe("addDaysToDateString", () => {
  it("rolls over months, years and leap days", () => {
    expect(addDaysToDateString("2026-12-25", 14)).toBe("2027-01-08");
    expect(addDaysToDateString("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToDateString("2026-03-28", 2)).toBe("2026-03-30");
  });
});

describe("toPublicOpeningException", () => {
  it("formats a closure with its note", () => {
    expect(
      toPublicOpeningException({
        date: "2026-12-25",
        isClosed: true,
        opensAt: null,
        closesAt: null,
        note: "Christmas Day",
      }),
    ).toEqual({
      date: "2026-12-25",
      label: "Fri 25 Dec",
      display: "Closed",
      note: "Christmas Day",
    });
  });

  it("formats special hours", () => {
    expect(
      toPublicOpeningException({
        date: "2026-12-24",
        isClosed: false,
        opensAt: "09:00",
        closesAt: "12:00",
        note: null,
      }).display,
    ).toBe("09:00–12:00");
  });

  it("never reports an incomplete open day as open", () => {
    expect(
      toPublicOpeningException({
        date: "2026-12-24",
        isClosed: false,
        opensAt: "09:00",
        closesAt: null,
        note: null,
      }).display,
    ).toBe("Closed");
  });
});
