import { describe, expect, it } from "vitest";
import { applyHoursPreset, type WeekEntries } from "./opening-hours-presets";

function week(overrides: Partial<WeekEntries> = {}): WeekEntries {
  const closed = {
    closed: true,
    opens: "",
    closes: "",
    opens2: "",
    closes2: "",
  };
  return {
    monday: {
      closed: false,
      opens: "09:00",
      closes: "17:30",
      opens2: "",
      closes2: "",
    },
    tuesday: closed,
    wednesday: {
      closed: false,
      opens: "10:00",
      closes: "12:00",
      opens2: "",
      closes2: "",
    },
    thursday: closed,
    friday: closed,
    saturday: {
      closed: false,
      opens: "10:00",
      closes: "14:00",
      opens2: "",
      closes2: "",
    },
    sunday: closed,
    ...overrides,
  };
}

describe("applyHoursPreset", () => {
  it("copies Monday to Tuesday-Friday and leaves the weekend alone", () => {
    const result = applyHoursPreset("monday-to-weekdays", week());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const day of ["tuesday", "wednesday", "thursday", "friday"] as const) {
      expect(result.entries[day]).toEqual({
        closed: false,
        opens: "09:00",
        closes: "17:30",
        opens2: "",
        closes2: "",
      });
    }
    expect(result.entries.saturday).toEqual(week().saturday);
    expect(result.changed).toEqual([
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ]);
  });

  it("copies a second window along with the first", () => {
    const monday = {
      closed: false,
      opens: "09:00",
      closes: "12:00",
      opens2: "13:00",
      closes2: "17:00",
    };
    const result = applyHoursPreset("monday-to-weekdays", week({ monday }));
    expect(result.ok && result.entries.friday).toEqual(monday);
  });

  it("copies Monday to every other day", () => {
    const result = applyHoursPreset("monday-to-all", week());
    expect(result.ok && result.changed).toEqual([
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);
  });

  it("copies a closed Monday as closed, clearing stale times", () => {
    const result = applyHoursPreset(
      "monday-to-weekdays",
      week({
        monday: {
          closed: true,
          opens: "",
          closes: "",
          opens2: "",
          closes2: "",
        },
      }),
    );
    expect(result.ok && result.entries.wednesday).toEqual({
      closed: true,
      opens: "",
      closes: "",
      opens2: "",
      closes2: "",
    });
  });

  it("refuses to copy an open Monday with missing times", () => {
    expect(
      applyHoursPreset(
        "monday-to-all",
        week({
          monday: {
            closed: false,
            opens: "09:00",
            closes: "",
            opens2: "",
            closes2: "",
          },
        }),
      ),
    ).toEqual({ ok: false, reason: "monday-incomplete" });
  });

  it("closes the weekend and reports only what changed", () => {
    const result = applyHoursPreset("close-weekend", week());
    expect(result.ok && result.entries.saturday).toEqual({
      closed: true,
      opens: "",
      closes: "",
      opens2: "",
      closes2: "",
    });
    expect(result.ok && result.changed).toEqual(["saturday"]);
  });

  it("does not mutate its input", () => {
    const input = week();
    const snapshot = JSON.stringify(input);
    applyHoursPreset("monday-to-all", input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("reports no change when the week already matches", () => {
    const first = applyHoursPreset("monday-to-all", week());
    if (!first.ok) throw new Error("expected ok");
    const again = applyHoursPreset("monday-to-all", first.entries);
    expect(again.ok && again.changed).toEqual([]);
  });
});
