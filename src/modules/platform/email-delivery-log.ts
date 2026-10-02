import "server-only";
import { desc, eq, gte, and, count } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { emailDeliveryLog } from "@/lib/database/schema/business-operations";
import type { EmailDeliveryOutcome } from "@/lib/email";

const MAX_ERROR_LENGTH = 200;
const RECENT_FAILURE_LIMIT = 10;

export async function recordEmailDelivery(
  outcome: EmailDeliveryOutcome,
): Promise<void> {
  await getDatabase()
    .insert(emailDeliveryLog)
    .values({
      category: outcome.category.slice(0, 60),
      mode: outcome.mode,
      status: outcome.status,
      error: outcome.error?.slice(0, MAX_ERROR_LENGTH) ?? null,
    });
}

export type EmailDeliverySummary = {
  periodDays: number;
  sent: number;
  failed: number;
  recentFailures: {
    category: string;
    error: string | null;
    occurredAt: Date;
  }[];
};

export const emptyEmailDeliverySummary: EmailDeliverySummary = {
  periodDays: 7,
  sent: 0,
  failed: 0,
  recentFailures: [],
};

export async function getEmailDeliverySummary(
  periodDays = 7,
): Promise<EmailDeliverySummary> {
  try {
    const database = getDatabase();
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const [rows, recentFailures] = await Promise.all([
      database
        .select({ status: emailDeliveryLog.status, value: count() })
        .from(emailDeliveryLog)
        .where(gte(emailDeliveryLog.occurredAt, since))
        .groupBy(emailDeliveryLog.status),
      database
        .select({
          category: emailDeliveryLog.category,
          error: emailDeliveryLog.error,
          occurredAt: emailDeliveryLog.occurredAt,
        })
        .from(emailDeliveryLog)
        .where(
          and(
            eq(emailDeliveryLog.status, "failed"),
            gte(emailDeliveryLog.occurredAt, since),
          ),
        )
        .orderBy(desc(emailDeliveryLog.occurredAt))
        .limit(RECENT_FAILURE_LIMIT),
    ]);
    const total = (status: string) =>
      rows.find((row) => row.status === status)?.value ?? 0;
    return {
      periodDays,
      sent: total("sent"),
      failed: total("failed"),
      recentFailures,
    };
  } catch {
    return { ...emptyEmailDeliverySummary, periodDays };
  }
}
