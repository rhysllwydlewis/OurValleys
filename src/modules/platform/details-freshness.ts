import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  detailsCheckReminderMonths,
  inactivityGraceDays,
} from "@/modules/businesses/lifecycle-automation";
import {
  buildDetailsFreshness,
  type DetailsFreshness,
  type DetailsFreshnessInput,
} from "./details-freshness-model";

interface FreshnessRow extends Record<string, unknown> {
  id: string;
  trading_name: string;
  last_confirmed_at: Date | string | null;
  next_confirmation_due_at: Date | string | null;
  stale_at: Date | string | null;
}

const toDate = (value: Date | string | null): Date | null =>
  value === null ? null : new Date(value);

/**
 * Read-only report over the live, public directory (published, not suspended,
 * not demo): how recently each owner confirmed their details. Uses the same
 * thresholds as the lifecycle job, so "ageing" matches the six-month reminder
 * and the unpublish date matches the grace period. Only the business name and
 * confirmation dates are selected.
 */
export async function getDetailsFreshness(
  now: Date = new Date(),
): Promise<DetailsFreshness> {
  const rows = await getDatabase().execute<FreshnessRow>(sql`
    select
      b.id,
      b.trading_name,
      bl.last_confirmed_at,
      bl.next_confirmation_due_at,
      bl.stale_at
    from business b
    left join business_lifecycle bl on bl.business_id = b.id
    where b.status = 'published'
      and b.suspended_at is null
      and b.is_demo = false
  `);
  const inputs: DetailsFreshnessInput[] = rows.map((row) => ({
    id: row.id,
    tradingName: row.trading_name,
    lastConfirmedAt: toDate(row.last_confirmed_at),
    nextConfirmationDueAt: toDate(row.next_confirmation_due_at),
    staleAt: toDate(row.stale_at),
  }));
  return buildDetailsFreshness(inputs, now, {
    ageingAfterMonths: detailsCheckReminderMonths,
    graceDays: inactivityGraceDays,
  });
}
