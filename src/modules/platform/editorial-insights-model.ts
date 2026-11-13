import { trafficSources } from "@/modules/businesses/traffic-source";

/**
 * Pure helpers for the admin "Content insights" page: which places, guides
 * and local stories residents open. Counts are anonymous page opens; nothing
 * here identifies a person.
 */
export const editorialKinds = ["place", "guide", "story"] as const;
export type EditorialKind = (typeof editorialKinds)[number];

export const editorialKindLabels: Record<
  EditorialKind,
  { singular: string; plural: string }
> = {
  place: { singular: "place", plural: "Places" },
  guide: { singular: "guide", plural: "Guides" },
  story: { singular: "local story", plural: "Local news" },
};

/** A repeat open by the same visitor inside this window counts once. */
export const EDITORIAL_DEDUPE_MINUTES = 30;
/** Raw rows are removed after this long (pruned by the retention job). */
export const EDITORIAL_VIEW_RETENTION_DAYS = 400;

export const EDITORIAL_WINDOWS = [7, 30, 90] as const;
export type EditorialWindow = (typeof EDITORIAL_WINDOWS)[number];
export const DEFAULT_EDITORIAL_WINDOW: EditorialWindow = 30;

export function parseEditorialWindow(
  value: string | undefined,
): EditorialWindow {
  const parsed = Number(value);
  return (EDITORIAL_WINDOWS as readonly number[]).includes(parsed)
    ? (parsed as EditorialWindow)
    : DEFAULT_EDITORIAL_WINDOW;
}

export function isEditorialKind(value: unknown): value is EditorialKind {
  return (
    typeof value === "string" &&
    (editorialKinds as readonly string[]).includes(value)
  );
}

/** Only the known traffic labels are stored; anything else becomes `direct`. */
export function normaliseEditorialSource(value: string | undefined): string {
  const cleaned = value?.trim().toLowerCase() ?? "";
  return (trafficSources as readonly string[]).includes(cleaned)
    ? cleaned
    : "direct";
}

export type EditorialItemRow = {
  itemId: string;
  title: string;
  /** Public page for the item, or null when it is no longer public. */
  href: string | null;
  views: number;
  /** Bar width, 0-100, relative to the busiest item of the same kind. */
  barPercent: number;
};

export type EditorialKindGroup = {
  kind: EditorialKind;
  totalViews: number;
  uniqueVisitors: number;
  rows: EditorialItemRow[];
  /** Items with views beyond the listed ones. */
  hiddenCount: number;
  /** Public items nobody opened in the period (a few titles, newest first). */
  unreadCount: number;
  unread: { itemId: string; title: string; href: string }[];
};

export type EditorialDailyPoint = { date: string; views: number };
export type EditorialSourceRow = {
  source: string;
  views: number;
  percent: number;
};

export type EditorialInsights = {
  windowDays: EditorialWindow;
  totalViews: number;
  groups: EditorialKindGroup[];
  daily: EditorialDailyPoint[];
  sources: EditorialSourceRow[];
};

/** Bar widths relative to the busiest row; a non-zero row never vanishes. */
export function withBarPercent<T extends { views: number }>(
  rows: readonly T[],
): (T & { barPercent: number })[] {
  const max = rows.reduce((top, row) => Math.max(top, row.views), 0);
  return rows.map((row) => ({
    ...row,
    barPercent:
      max === 0 || row.views === 0
        ? 0
        : Math.max(4, Math.round((row.views / max) * 100)),
  }));
}

/**
 * One point per London day across the window, zero-filled, oldest first, so a
 * quiet day shows as a gap rather than being skipped.
 */
export function fillDailySeries(
  counts: ReadonlyMap<string, number>,
  endDate: string,
  days: number,
): EditorialDailyPoint[] {
  const [year, month, day] = endDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const end = Date.UTC(year, month - 1, day);
  const points: EditorialDailyPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end - offset * 86_400_000).toISOString().slice(0, 10);
    points.push({ date, views: counts.get(date) ?? 0 });
  }
  return points;
}

export function buildSourceRows(
  counts: readonly { source: string; views: number }[],
): EditorialSourceRow[] {
  const total = counts.reduce((sum, row) => sum + row.views, 0);
  return [...counts]
    .sort((a, b) => b.views - a.views || a.source.localeCompare(b.source))
    .map((row) => ({
      ...row,
      percent: total === 0 ? 0 : Math.round((row.views / total) * 100),
    }));
}

/** Plain-English labels for the admin page (the admin area is English-only). */
export const editorialSourceLabels: Record<string, string> = {
  qr: "A QR code",
  print: "A printed poster or card",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  email: "Email",
  directory: "The business directory",
  search: "Our Valleys search",
  map: "The valleys map",
  whats_on: "What's on and offers",
  news_guides: "News and guides",
  home: "The home page",
  search_engine: "A search engine",
  social: "Social media or messaging",
  other_site: "Another website",
  direct: "Direct or unknown",
};
