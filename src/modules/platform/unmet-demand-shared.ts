export const UNMET_DEMAND_WINDOWS = [7, 30, 90] as const;
export type UnmetDemandWindow = (typeof UNMET_DEMAND_WINDOWS)[number];

export const DEFAULT_UNMET_DEMAND_WINDOW: UnmetDemandWindow = 30;

export type UnmetDemandRow = {
  queryText: string | null;
  categorySlug: string | null;
  placeSlug: string | null;
  occurrences: number;
  lastSeen: Date;
};

export const UNMET_DEMAND_DISMISSAL_STATUSES = [
  "seeded",
  "out_of_scope",
] as const;
export type UnmetDemandDismissalStatus =
  (typeof UNMET_DEMAND_DISMISSAL_STATUSES)[number];

type UnmetDemandKeyParts = Pick<
  UnmetDemandRow,
  "queryText" | "categorySlug" | "placeSlug"
>;

/** Stable identity of a grouped row, used to remember a dismissal. */
export function unmetDemandKey(parts: UnmetDemandKeyParts): string {
  return JSON.stringify([
    parts.queryText ?? null,
    parts.categorySlug ?? null,
    parts.placeSlug ?? null,
  ]);
}

/**
 * A dismissed row stays hidden until it is searched again after the decision,
 * so a repeat of "seeded" demand resurfaces as a signal to look again.
 */
export function isUnmetDemandDismissed(
  row: Pick<UnmetDemandRow, "lastSeen">,
  dismissedAt: Date | undefined,
): boolean {
  return dismissedAt !== undefined && row.lastSeen <= dismissedAt;
}

/** Unknown or missing values fall back to the default window. */
export function parseUnmetDemandWindow(
  value: string | undefined,
): UnmetDemandWindow {
  const days = Number(value);
  return (
    UNMET_DEMAND_WINDOWS.find((window) => window === days) ??
    DEFAULT_UNMET_DEMAND_WINDOW
  );
}
