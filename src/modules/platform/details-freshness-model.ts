/**
 * Details freshness: which live listings have not had their details confirmed
 * by the owner recently. Pure model so the grouping, counts and ordering can
 * be tested without a database.
 */

export const freshnessGroups = ["overdue", "ageing", "never"] as const;

/**
 * - `overdue`: the yearly confirmation has lapsed; the public page already
 *   says "not recently confirmed" and the listing is unpublished automatically
 *   once the grace period ends.
 * - `ageing`: confirmed, but longer ago than the reminder threshold.
 * - `never`: published without the owner ever confirming the details.
 */
export type FreshnessGroup = (typeof freshnessGroups)[number];

export function isFreshnessGroup(value: string): value is FreshnessGroup {
  return (freshnessGroups as readonly string[]).includes(value);
}

export interface DetailsFreshnessInput {
  id: string;
  tradingName: string;
  lastConfirmedAt: Date | null;
  nextConfirmationDueAt: Date | null;
  staleAt: Date | null;
}

export interface DetailsFreshnessRow {
  id: string;
  tradingName: string;
  group: FreshnessGroup;
  lastConfirmedAt: Date | null;
  /** Overdue only: when the listing is unpublished unless confirmed first. */
  unpublishesAt: Date | null;
}

export interface DetailsFreshness {
  rows: DetailsFreshnessRow[];
  counts: Record<FreshnessGroup, number>;
  /** Confirmed within the reminder threshold and not overdue. */
  fresh: number;
  total: number;
}

export interface FreshnessRules {
  /** A confirmation older than this many months counts as ageing. */
  ageingAfterMonths: number;
  /** Days between a listing going overdue and being unpublished. */
  graceDays: number;
}

const dayMs = 24 * 60 * 60 * 1000;

function monthsBefore(value: Date, months: number): Date {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
}

const groupOrder: Record<FreshnessGroup, number> = {
  overdue: 0,
  ageing: 1,
  never: 2,
};

/** Earliest first; a missing date sorts last. */
function byDate(a: Date | null, b: Date | null): number {
  if (a && b) return a.getTime() - b.getTime();
  return a ? -1 : b ? 1 : 0;
}

export function buildDetailsFreshness(
  inputs: readonly DetailsFreshnessInput[],
  now: Date,
  rules: FreshnessRules,
): DetailsFreshness {
  const ageingBefore = monthsBefore(now, rules.ageingAfterMonths);
  const counts: Record<FreshnessGroup, number> = {
    overdue: 0,
    ageing: 0,
    never: 0,
  };
  const rows: DetailsFreshnessRow[] = [];
  let fresh = 0;

  for (const input of inputs) {
    const stale = Boolean(input.staleAt && input.staleAt <= now);
    const due = Boolean(
      input.nextConfirmationDueAt && input.nextConfirmationDueAt <= now,
    );
    let group: FreshnessGroup | null = null;
    if (stale || due) group = "overdue";
    else if (!input.lastConfirmedAt) group = "never";
    else if (input.lastConfirmedAt <= ageingBefore) group = "ageing";

    if (!group) {
      fresh += 1;
      continue;
    }
    counts[group] += 1;
    rows.push({
      id: input.id,
      tradingName: input.tradingName,
      group,
      lastConfirmedAt: input.lastConfirmedAt,
      // The grace period only starts once the nightly job marks the listing
      // stale, so there is no date to show before then.
      unpublishesAt:
        group === "overdue" && input.staleAt
          ? new Date(input.staleAt.getTime() + rules.graceDays * dayMs)
          : null,
    });
  }

  // Most urgent first: overdue by soonest unpublish date, then the oldest
  // confirmations, then listings never confirmed.
  rows.sort(
    (a, b) =>
      groupOrder[a.group] - groupOrder[b.group] ||
      byDate(a.unpublishesAt, b.unpublishesAt) ||
      byDate(a.lastConfirmedAt, b.lastConfirmedAt) ||
      a.tradingName.localeCompare(b.tradingName, "en-GB"),
  );

  return { rows, counts, fresh, total: inputs.length };
}
