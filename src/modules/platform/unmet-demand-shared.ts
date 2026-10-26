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
