import { describe, expect, it } from "vitest";
import {
  englandAndWalesBankHolidays,
  upcomingBankHolidays,
} from "@/modules/businesses/bank-holidays";
import {
  parseSpecialDayForm,
  parseWeeklyHoursForm,
  weekdayOrder,
} from "@/modules/businesses/opening-hours-form";

const reader = (fields: Record<string, string>) => (name: string) =>
  fields[name] ?? "";

describe("parseWeeklyHoursForm", () => {
  it("returns all seven days in order with times for open days", () => {
    const days = parseWeeklyHoursForm(
      reader({
        "opens-monday": "09:00",
        "closes-monday": "17:00",
        "closed-sunday": "on",
      }),
    );
    expect(days.map((day) => day.day)).toEqual([...weekdayOrder]);
    expect(days[0]).toEqual({
      day: "monday",
      closed: false,
      opensAt: "09:00",
      closesAt: "17:00",
    });
  });

  it("drops stale times on a day ticked closed", () => {
    const [monday] = parseWeeklyHoursForm(
      reader({
        "closed-monday": "on",
        "opens-monday": "09:00",
        "closes-monday": "17:00",
      }),
    );
    expect(monday).toEqual({
      day: "monday",
      closed: true,
      opensAt: null,
      closesAt: null,
    });
  });

  it("turns blank times into null so the shared schema rejects them", () => {
    const [monday] = parseWeeklyHoursForm(reader({ "opens-monday": "  " }));
    expect(monday).toMatchObject({ closed: false, opensAt: null });
  });
});

describe("parseSpecialDayForm", () => {
  it("parses an open special day with a trimmed note", () => {
    expect(
      parseSpecialDayForm(
        reader({
          date: " 2026-12-24 ",
          opens: "09:00",
          closes: "12:00",
          note: "  Christmas Eve ",
        }),
      ),
    ).toEqual({
      date: "2026-12-24",
      closed: false,
      opensAt: "09:00",
      closesAt: "12:00",
      note: "Christmas Eve",
    });
  });

  it("ignores times and blank notes for a closure", () => {
    expect(
      parseSpecialDayForm(
        reader({ date: "2026-12-25", closed: "on", opens: "09:00", note: " " }),
      ),
    ).toEqual({
      date: "2026-12-25",
      closed: true,
      opensAt: null,
      closesAt: null,
      note: null,
    });
  });
});

describe("bank holiday suggestions", () => {
  it("lists England and Wales holidays in date order with no duplicates", () => {
    const dates = englandAndWalesBankHolidays.map((holiday) => holiday.date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("includes the substitute days GOV.UK publishes", () => {
    const byDate = new Map(
      englandAndWalesBankHolidays.map((holiday) => [holiday.date, holiday]),
    );
    // 25 December 2027 is a Saturday, so Christmas moves to Monday 27th.
    expect(byDate.get("2027-12-27")?.title).toContain("substitute");
    expect(byDate.has("2027-12-25")).toBe(false);
  });

  it("offers only upcoming holidays inside the window, minus those already set", () => {
    const result = upcomingBankHolidays({
      now: new Date("2026-12-20T10:00:00Z"),
      days: 20,
      alreadySet: ["2026-12-28"],
    });
    expect(result.map((holiday) => holiday.date)).toEqual([
      "2026-12-25",
      "2027-01-01",
    ]);
  });

  it("includes today and stops offering anything once the list has run out", () => {
    expect(
      upcomingBankHolidays({
        now: new Date("2026-12-25T09:00:00Z"),
        days: 0,
      }).map((holiday) => holiday.date),
    ).toEqual(["2026-12-25"]);
    expect(
      upcomingBankHolidays({ now: new Date("2031-01-01T00:00:00Z") }),
    ).toEqual([]);
  });
});
