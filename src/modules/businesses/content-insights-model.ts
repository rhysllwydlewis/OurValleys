/**
 * Pure helpers for the "Offers and events" panel on owner insights: ranking
 * each item by how many times its page was opened. Counts are anonymous page
 * opens recorded against the item, plus residents who saved it; nothing here
 * identifies a person.
 */
export const contentKinds = ["offer", "event"] as const;
export type ContentKind = (typeof contentKinds)[number];

export const contentViewEventTypes = {
  offer: "offer_view",
  event: "event_view",
} as const satisfies Record<ContentKind, string>;

/** How many items per kind the panel lists; the rest are summarised. */
export const CONTENT_PANEL_LIMIT = 6;

export type ContentPerformanceInput = {
  kind: ContentKind;
  itemId: string;
  title: string;
  views: number;
  saves: number;
};

export type ContentPerformanceRow = ContentPerformanceInput & {
  /** Bar width, 0-100, relative to the busiest item of the same kind. */
  barPercent: number;
};

export type ContentPerformanceGroup = {
  kind: ContentKind;
  rows: ContentPerformanceRow[];
  /** Items beyond the listed ones. */
  hiddenCount: number;
  totalViews: number;
  totalSaves: number;
};

export function isContentKind(value: unknown): value is ContentKind {
  return value === "offer" || value === "event";
}

/** Busiest first; ties by saves, then alphabetically so the order is stable. */
export function rankContent(
  items: readonly ContentPerformanceInput[],
): ContentPerformanceInput[] {
  return [...items].sort(
    (a, b) =>
      b.views - a.views ||
      b.saves - a.saves ||
      a.title.localeCompare(b.title, "en", { sensitivity: "base" }) ||
      a.itemId.localeCompare(b.itemId),
  );
}

export function buildContentGroup(
  kind: ContentKind,
  items: readonly ContentPerformanceInput[],
  limit: number = CONTENT_PANEL_LIMIT,
): ContentPerformanceGroup {
  const ranked = rankContent(items.filter((item) => item.kind === kind)).map(
    (item) => ({
      ...item,
      views: Math.max(0, Math.floor(item.views)),
      saves: Math.max(0, Math.floor(item.saves)),
    }),
  );
  const top = ranked[0]?.views ?? 0;
  const rows = ranked.slice(0, limit).map((item) => ({
    ...item,
    barPercent:
      top === 0 ? 0 : Math.max(2, Math.round((item.views / top) * 100)),
  }));
  return {
    kind,
    rows,
    hiddenCount: Math.max(0, ranked.length - rows.length),
    totalViews: ranked.reduce((sum, item) => sum + item.views, 0),
    totalSaves: ranked.reduce((sum, item) => sum + item.saves, 0),
  };
}

export function hasAnyContent(groups: readonly ContentPerformanceGroup[]) {
  return groups.some((group) => group.rows.length > 0);
}
