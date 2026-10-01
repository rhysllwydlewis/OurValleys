import {
  addDaysToDateString,
  londonDateString,
} from "./opening-hours-exceptions";

export type BankHoliday = { date: string; title: string };

/**
 * England and Wales bank holidays, including substitute days, from the
 * official GOV.UK list (https://www.gov.uk/bank-holidays.json, retrieved
 * 1 October 2026). Used only to offer one-click "closed" suggestions to
 * business owners; nothing is applied automatically. The list is static, so
 * add the following year when GOV.UK publishes it. Once the dates run out the
 * suggestions simply stop.
 */
export const englandAndWalesBankHolidays: readonly BankHoliday[] = [
  { date: "2026-12-25", title: "Christmas Day" },
  { date: "2026-12-28", title: "Boxing Day (substitute day)" },
  { date: "2027-01-01", title: "New Year’s Day" },
  { date: "2027-03-26", title: "Good Friday" },
  { date: "2027-03-29", title: "Easter Monday" },
  { date: "2027-05-03", title: "Early May bank holiday" },
  { date: "2027-05-31", title: "Spring bank holiday" },
  { date: "2027-08-30", title: "Summer bank holiday" },
  { date: "2027-12-27", title: "Christmas Day (substitute day)" },
  { date: "2027-12-28", title: "Boxing Day (substitute day)" },
  { date: "2028-01-03", title: "New Year’s Day (substitute day)" },
  { date: "2028-04-14", title: "Good Friday" },
  { date: "2028-04-17", title: "Easter Monday" },
  { date: "2028-05-01", title: "Early May bank holiday" },
  { date: "2028-05-29", title: "Spring bank holiday" },
  { date: "2028-08-28", title: "Summer bank holiday" },
  { date: "2028-12-25", title: "Christmas Day" },
  { date: "2028-12-26", title: "Boxing Day" },
];

/** Bank holidays from today (London) onwards within `days`, excluding dates already set. */
export function upcomingBankHolidays(input: {
  now?: Date;
  days?: number;
  alreadySet?: readonly string[];
  holidays?: readonly BankHoliday[];
}): BankHoliday[] {
  const today = londonDateString(input.now ?? new Date());
  const last = addDaysToDateString(today, input.days ?? 180);
  const taken = new Set(input.alreadySet ?? []);
  return (input.holidays ?? englandAndWalesBankHolidays).filter(
    (holiday) =>
      holiday.date >= today && holiday.date <= last && !taken.has(holiday.date),
  );
}
