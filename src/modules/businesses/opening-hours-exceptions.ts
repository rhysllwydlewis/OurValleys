import type { PublicOpeningException } from "./types";

/** How far ahead public pages show special-day hours. */
export const UPCOMING_EXCEPTION_DAYS = 14;

const londonDateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const labelFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** The Europe/London calendar date (YYYY-MM-DD) of an instant. */
export function londonDateString(now: Date): string {
  const parts = londonDateFormat.formatToParts(now);
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

/** Adds whole calendar days to a YYYY-MM-DD date without timezone drift. */
export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export type ExceptionRow = {
  date: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
};

export function toPublicOpeningException(
  row: ExceptionRow,
): PublicOpeningException {
  const [year, month, day] = row.date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return {
    date: row.date,
    label: labelFormat.format(new Date(Date.UTC(year, month - 1, day))),
    display:
      row.isClosed || !row.opensAt || !row.closesAt
        ? "Closed"
        : `${row.opensAt}–${row.closesAt}`,
    note: row.note,
  };
}
