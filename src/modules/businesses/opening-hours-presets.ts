import { weekdayOrder, type Weekday } from "./opening-hours-form";

/**
 * One-click helpers for the weekly editor. They only rewrite what is on the
 * form; nothing is saved until the owner presses save, so a wrong click is
 * undone by reloading the page.
 */
export type HoursPreset =
  "monday-to-weekdays" | "monday-to-all" | "close-weekend";

export type DayEntry = {
  closed: boolean;
  opens: string;
  closes: string;
  /** The optional second window; empty strings when there is none. */
  opens2: string;
  closes2: string;
};
export type WeekEntries = Record<Weekday, DayEntry>;

export type PresetResult =
  | { ok: true; entries: WeekEntries; changed: Weekday[] }
  /** Monday is open but has no times to copy yet. */
  | { ok: false; reason: "monday-incomplete" };

const WEEKDAYS: Weekday[] = ["tuesday", "wednesday", "thursday", "friday"];
const WEEKEND: Weekday[] = ["saturday", "sunday"];

const sameEntry = (a: DayEntry, b: DayEntry) =>
  a.closed === b.closed &&
  a.opens === b.opens &&
  a.closes === b.closes &&
  a.opens2 === b.opens2 &&
  a.closes2 === b.closes2;

const CLOSED_ENTRY: DayEntry = {
  closed: true,
  opens: "",
  closes: "",
  opens2: "",
  closes2: "",
};

export function applyHoursPreset(
  preset: HoursPreset,
  entries: WeekEntries,
): PresetResult {
  const next = Object.fromEntries(
    weekdayOrder.map((day) => [day, { ...entries[day] }]),
  ) as WeekEntries;

  if (preset === "close-weekend") {
    for (const day of WEEKEND) {
      next[day] = { ...CLOSED_ENTRY };
    }
  } else {
    const monday = entries.monday;
    if (!monday.closed && (!monday.opens || !monday.closes)) {
      return { ok: false, reason: "monday-incomplete" };
    }
    const targets =
      preset === "monday-to-weekdays"
        ? WEEKDAYS
        : weekdayOrder.filter((day) => day !== "monday");
    for (const day of targets) {
      next[day] = monday.closed ? { ...CLOSED_ENTRY } : { ...monday };
    }
  }

  const changed = weekdayOrder.filter(
    (day) => !sameEntry(entries[day], next[day]),
  );
  return { ok: true, entries: next, changed };
}
