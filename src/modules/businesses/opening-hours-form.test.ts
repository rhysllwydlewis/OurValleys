import { describe, expect, it } from "vitest";
import {
  parseWeeklyHoursForm,
  validateWeeklyHours,
  weekdayOrder,
} from "./opening-hours-form";

function reader(fields: Record<string, string>) {
  return (name: string) => fields[name] ?? "";
}

function weekFields(extra: Record<string, string> = {}) {
  const fields: Record<string, string> = {};
  for (const day of weekdayOrder) {
    fields[`opens-${day}`] = "09:00";
    fields[`closes-${day}`] = "12:00";
  }
  return { ...fields, ...extra };
}

describe("weekly hours form with a second window", () => {
  it("reads the second window and leaves it null when blank", () => {
    const days = parseWeeklyHoursForm(
      reader(
        weekFields({
          "opens2-wednesday": "13:00",
          "closes2-wednesday": "17:00",
        }),
      ),
    );
    expect(days.find((day) => day.day === "wednesday")).toMatchObject({
      secondOpensAt: "13:00",
      secondClosesAt: "17:00",
    });
    expect(days.find((day) => day.day === "monday")).toMatchObject({
      secondOpensAt: null,
      secondClosesAt: null,
    });
  });

  it("ignores a stale second window on a day ticked closed", () => {
    const days = parseWeeklyHoursForm(
      reader(
        weekFields({
          "closed-sunday": "on",
          "opens2-sunday": "13:00",
          "closes2-sunday": "17:00",
        }),
      ),
    );
    expect(days.find((day) => day.day === "sunday")).toMatchObject({
      closed: true,
      secondOpensAt: null,
      secondClosesAt: null,
    });
    expect(validateWeeklyHours(days).ok).toBe(true);
  });

  it("points each problem at the second-window input that caused it", () => {
    const check = (fields: Record<string, string>) => {
      const result = validateWeeklyHours(
        parseWeeklyHoursForm(reader(weekFields(fields))),
      );
      return result.ok ? null : Object.keys(result.fieldErrors);
    };
    expect(check({ "opens2-friday": "13:00" })).toEqual(["closes2-friday"]);
    expect(check({ "closes2-friday": "17:00" })).toEqual(["opens2-friday"]);
    expect(
      check({ "opens2-friday": "11:00", "closes2-friday": "17:00" }),
    ).toEqual(["opens2-friday"]);
    expect(
      check({ "opens2-friday": "15:00", "closes2-friday": "14:00" }),
    ).toEqual(["closes2-friday"]);
  });

  it("accepts a valid break and old data without the new fields", () => {
    expect(
      validateWeeklyHours(
        parseWeeklyHoursForm(
          reader(
            weekFields({
              "opens2-friday": "13:00",
              "closes2-friday": "17:00",
            }),
          ),
        ),
      ).ok,
    ).toBe(true);
    const legacy = weekdayOrder.map((day) => ({
      day,
      closed: false,
      opensAt: "09:00",
      closesAt: "17:00",
    }));
    expect(validateWeeklyHours(legacy).ok).toBe(true);
  });
});
