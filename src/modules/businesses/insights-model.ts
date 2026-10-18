import {
  describePeriodChange,
  type BusinessActivityType,
  type BusinessAnalyticsSummary,
  type DailyActivityPoint,
  type PeriodChange,
} from "./analytics";
import type { SourceBreakdownRow } from "./traffic-source";

/**
 * Pure arithmetic and wording rules for the owner Insights page. Nothing here
 * reads the database, so the rules that decide what an owner is told ("your
 * busiest day is Saturday") are unit tested on their own.
 */

export const contactChannelTypes = [
  "call_click",
  "email_click",
  "directions_click",
  "external_click",
  "booking_click",
  "order_click",
] as const satisfies ReadonlyArray<BusinessActivityType>;

export type ContactChannelType = (typeof contactChannelTypes)[number];

/** The area of the website a contact button was used from. */
export const clickSurfaces = [
  "business_website",
  "offer",
  "event",
  "menu_document",
  "other",
] as const;
export type ClickSurface = (typeof clickSurfaces)[number];

const surfaceSet = new Set<string>(clickSurfaces);

export function normaliseClickSurface(source: string): ClickSurface {
  return surfaceSet.has(source) ? (source as ClickSurface) : "other";
}

export type ClickSurfaceRow = { surface: ClickSurface; count: number };

/**
 * Folds raw (source, count) rows onto the known surfaces, largest first, with
 * unknown labels counted as "other" so free text never reaches the page.
 */
export function buildClickSurfaces(
  rows: ReadonlyArray<{ source: string; count: number }>,
): ClickSurfaceRow[] {
  const totals = new Map<ClickSurface, number>();
  for (const row of rows) {
    if (row.count <= 0) continue;
    const surface = normaliseClickSurface(row.source);
    totals.set(surface, (totals.get(surface) ?? 0) + row.count);
  }
  return [...totals.entries()]
    .map(([surface, count]) => ({ surface, count }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        clickSurfaces.indexOf(a.surface) - clickSurfaces.indexOf(b.surface),
    );
}

export type FunnelStep = {
  key: "appearances" | "views" | "contacts";
  value: number;
  /** Bar length as a whole percent of the largest step. */
  barPercent: number;
};

/**
 * The three steps of "found you, looked, got in touch". "Got in touch" is a
 * tracked contact button plus an enquiry form, the two ways a visitor can act.
 */
export function buildFunnel(
  totals: Pick<
    BusinessAnalyticsSummary,
    "searchAppearances" | "totalViews" | "contactActions" | "enquiries"
  >,
): FunnelStep[] {
  const contacts = totals.contactActions + totals.enquiries;
  const values: Array<[FunnelStep["key"], number]> = [
    ["appearances", totals.searchAppearances],
    ["views", totals.totalViews],
    ["contacts", contacts],
  ];
  const max = Math.max(1, ...values.map(([, value]) => value));
  return values.map(([key, value]) => ({
    key,
    value,
    barPercent: value === 0 ? 0 : Math.max(2, Math.round((value / max) * 100)),
  }));
}

/**
 * Visits that led to someone getting in touch, as a whole percent, or null
 * when there were no visits to measure against. Capped at 100 because one
 * visit can lead to several actions.
 */
export const minViewsForRate = 30;

export function contactRate(
  views: number,
  contactActions: number,
  enquiries: number,
): number | null {
  // One contact in three visits is not a rate worth quoting.
  if (views < minViewsForRate) return null;
  return Math.min(
    100,
    Math.round(((contactActions + enquiries) / views) * 100),
  );
}

export type WeekdayRow = {
  /** 0 = Monday ... 6 = Sunday. */
  weekday: number;
  views: number;
  /** Bar length as a whole percent of the busiest weekday. */
  barPercent: number;
};

/** `YYYY-MM-DD` to Monday-first weekday index. Noon UTC avoids DST edges. */
export function weekdayIndex(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return (day + 6) % 7;
}

/** Views added up per weekday over the period, Monday first. */
export function buildWeekdayPattern(
  daily: ReadonlyArray<Pick<DailyActivityPoint, "date" | "views">>,
): WeekdayRow[] {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const point of daily) {
    const index = weekdayIndex(point.date);
    totals[index] = (totals[index] ?? 0) + point.views;
  }
  const max = Math.max(1, ...totals);
  return totals.map((views, weekday) => ({
    weekday,
    views,
    barPercent: views === 0 ? 0 : Math.max(2, Math.round((views / max) * 100)),
  }));
}

/** The weekday with the most views, or null when there was no clear winner. */
export function busiestWeekday(rows: readonly WeekdayRow[]): number | null {
  const top = Math.max(0, ...rows.map((row) => row.views));
  if (top === 0) return null;
  const leaders = rows.filter((row) => row.views === top);
  return leaders.length === 1 ? leaders[0]!.weekday : null;
}

export type Highlight =
  | { kind: "quiet" }
  | { kind: "views"; change: PeriodChange }
  | { kind: "topSource"; source: string; percent: number }
  | { kind: "busiestDay"; weekday: number }
  | { kind: "topChannel"; channel: ContactChannelType; count: number }
  | { kind: "contactRate"; percent: number }
  | { kind: "noQr" }
  | { kind: "noContact" };

/**
 * Up to four plain-language observations, most useful first. Each is a fact
 * that is true of the numbers, never advice that could be wrong for a
 * particular business, and none appears when there is too little to say it.
 */
export function buildHighlights(input: {
  summary: BusinessAnalyticsSummary;
  sources: readonly SourceBreakdownRow[];
  weekdays: readonly WeekdayRow[];
}): Highlight[] {
  const { summary, sources, weekdays } = input;
  if (summary.totalViews === 0 && summary.searchAppearances === 0) {
    return [{ kind: "quiet" }];
  }
  const highlights: Highlight[] = [];

  const change = describePeriodChange(
    summary.totalViews,
    summary.previous.totalViews,
  );
  if (
    summary.totalViews >= 10 &&
    (change.kind === "change" || change.kind === "new")
  ) {
    highlights.push({ kind: "views", change });
  }

  const top = sources[0];
  const attributed = sources.reduce((sum, row) => sum + row.count, 0);
  // A single visit is an anecdote, not a pattern.
  if (top && attributed >= 5) {
    highlights.push({
      kind: "topSource",
      source: top.source,
      percent: top.percent,
    });
  }

  const day = busiestWeekday(weekdays);
  if (day !== null && summary.totalViews >= 10) {
    highlights.push({ kind: "busiestDay", weekday: day });
  }

  const channels = contactChannelTypes
    .map((channel) => ({ channel, count: summary.byType[channel] }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  if (channels[0] && channels[0].count >= 2) {
    highlights.push({
      kind: "topChannel",
      channel: channels[0].channel,
      count: channels[0].count,
    });
  }

  const rate = contactRate(
    summary.totalViews,
    summary.contactActions,
    summary.enquiries,
  );
  if (rate !== null && rate > 0) {
    highlights.push({ kind: "contactRate", percent: rate });
  } else if (
    summary.totalViews >= 10 &&
    summary.contactActions + summary.enquiries === 0
  ) {
    highlights.push({ kind: "noContact" });
  }

  if (summary.qrVisits === 0 && summary.totalViews >= 10) {
    highlights.push({ kind: "noQr" });
  }
  return highlights.slice(0, 4);
}

/** Quotes a CSV field when it holds a comma, quote or line break. */
function csvField(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The daily figures as CSV. Only dates and counts, so no field can carry
 * spreadsheet formulas or anything about an individual visitor.
 */
export function buildInsightsCsv(daily: readonly DailyActivityPoint[]): string {
  const lines = [["date", "views", "contact_actions", "enquiries"]];
  for (const point of daily) {
    lines.push([
      point.date,
      String(point.views),
      String(point.contactActions),
      String(point.enquiries),
    ]);
  }
  return `${lines.map((line) => line.map(csvField).join(",")).join("\r\n")}\r\n`;
}
