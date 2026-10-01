export const weekdayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof weekdayOrder)[number];

export const weekdayLabels: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type Reader = (name: string) => string;

function time(read: Reader, name: string): string | null {
  const value = read(name).trim();
  return value.length > 0 ? value : null;
}

/**
 * Builds the weekly-hours payload from form fields. A closed day never
 * carries times, so a stale time left in a ticked-closed row is ignored.
 * Validation (open days need ordered times) is left to the shared schema.
 */
export function parseWeeklyHoursForm(read: Reader) {
  return weekdayOrder.map((day) => {
    const closed = read(`closed-${day}`) === "on";
    return {
      day,
      closed,
      opensAt: closed ? null : time(read, `opens-${day}`),
      closesAt: closed ? null : time(read, `closes-${day}`),
    };
  });
}

export function parseSpecialDayForm(read: Reader) {
  const closed = read("closed") === "on";
  return {
    date: read("date").trim(),
    closed,
    opensAt: closed ? null : time(read, "opens"),
    closesAt: closed ? null : time(read, "closes"),
    note: read("note").trim() || null,
  };
}
