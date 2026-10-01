import { describe, expect, it } from "vitest";
import {
  englandAndWalesBankHolidays,
  upcomingBankHolidays,
} from "@/modules/businesses/bank-holidays";
import {
  parseSpecialDayForm,
  parseWeeklyHoursForm,
  validateSpecialDay,
  validateWeeklyHours,
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

function weekWith(
  overrides: Record<
    string,
    { closed: boolean; opensAt: string | null; closesAt: string | null }
  >,
) {
  return weekdayOrder.map((day) => ({
    day,
    ...(overrides[day] ?? { closed: true, opensAt: null, closesAt: null }),
  }));
}

describe("validateWeeklyHours", () => {
  it("accepts a valid week", () => {
    const result = validateWeeklyHours(
      weekWith({
        monday: { closed: false, opensAt: "09:00", closesAt: "17:00" },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("points at the opening time of an open day with no times", () => {
    const result = validateWeeklyHours(
      weekWith({ tuesday: { closed: false, opensAt: null, closesAt: null } }),
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { "opens-tuesday": expect.stringContaining("require") },
    });
    if (!result.ok) {
      expect(result.summary).toBe(
        `Tuesday: ${result.fieldErrors["opens-tuesday"]}`,
      );
    }
  });

  it("points at the closing time when it is not after opening", () => {
    const result = validateWeeklyHours(
      weekWith({
        friday: { closed: false, opensAt: "18:00", closesAt: "09:00" },
      }),
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { "closes-friday": expect.stringContaining("later") },
    });
  });

  it("names the first problem and counts the rest", () => {
    const result = validateWeeklyHours(
      weekWith({
        monday: { closed: false, opensAt: null, closesAt: null },
        thursday: { closed: false, opensAt: "17:00", closesAt: "08:00" },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "closes-thursday",
      "opens-monday",
    ]);
    expect(result.summary).toMatch(/^Monday: .*\. 1 more to fix\.$/);
  });

  it("reports a malformed week without a field to blame", () => {
    const result = validateWeeklyHours([]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.summary.length).toBeGreaterThan(0);
  });
});

describe("validateSpecialDay", () => {
  const today = "2026-12-01";
  const closed = {
    date: "2026-12-25",
    closed: true,
    opensAt: null,
    closesAt: null,
    note: null,
  };

  it("accepts today and later dates", () => {
    expect(validateSpecialDay(closed, today).ok).toBe(true);
    expect(validateSpecialDay({ ...closed, date: today }, today).ok).toBe(true);
  });

  it("refuses a past date and says so against the date field", () => {
    expect(
      validateSpecialDay({ ...closed, date: "2026-11-30" }, today),
    ).toEqual({
      ok: false,
      summary: "Choose today or a later date.",
      fieldErrors: { date: "Choose today or a later date." },
    });
  });

  it("refuses an impossible date", () => {
    const result = validateSpecialDay({ ...closed, date: "2026-02-30" }, today);
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { date: "Choose a valid date." },
    });
  });

  it("points at the opening time for an open day without times", () => {
    const result = validateSpecialDay({ ...closed, closed: false }, today);
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { opens: expect.any(String) },
    });
  });

  it("points at the closing time when it is not after opening", () => {
    const result = validateSpecialDay(
      { ...closed, closed: false, opensAt: "17:00", closesAt: "09:00" },
      today,
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { closes: expect.stringContaining("later") },
    });
  });

  it("limits the note length with a friendly message", () => {
    const result = validateSpecialDay(
      { ...closed, note: "x".repeat(121) },
      today,
    );
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { note: "Keep the note to 120 characters." },
    });
  });
});
