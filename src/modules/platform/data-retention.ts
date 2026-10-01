import { lt } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { session, verification } from "@/lib/database/schema/auth";
import { businessActivityEvent } from "@/lib/database/schema/business-operations";

/**
 * Expired session and verification rows are already unusable, so they are kept
 * only briefly for support diagnostics before being removed.
 */
export const EXPIRED_SESSION_GRACE_DAYS = 30;
export const EXPIRED_VERIFICATION_GRACE_DAYS = 7;
/**
 * Raw business activity events (views, clicks, hashed visitor ids) are kept
 * long enough for a year-on-year period comparison and no longer.
 */
export const ACTIVITY_EVENT_RETENTION_MONTHS = 26;

const DAY_MS = 86_400_000;

export function computeRetentionCutoffs(now: Date) {
  const activityCutoff = new Date(now);
  activityCutoff.setUTCMonth(
    activityCutoff.getUTCMonth() - ACTIVITY_EVENT_RETENTION_MONTHS,
  );
  return {
    sessionCutoff: new Date(
      now.getTime() - EXPIRED_SESSION_GRACE_DAYS * DAY_MS,
    ),
    verificationCutoff: new Date(
      now.getTime() - EXPIRED_VERIFICATION_GRACE_DAYS * DAY_MS,
    ),
    activityCutoff,
  };
}

function reportFailure(
  result: PlatformRetentionResult,
  purge: string,
  error: unknown,
) {
  result.failures.push(purge);
  console.error(
    JSON.stringify({
      level: "error",
      event: "platform_retention_purge_failed",
      purge,
      message: error instanceof Error ? error.message : "Unknown error",
    }),
  );
}

export type PlatformRetentionResult = {
  sessions: number;
  verifications: number;
  activityEvents: number;
  /** Names of the purges that threw; empty when every purge succeeded. */
  failures: string[];
};

/**
 * Removes expired authentication artefacts and out-of-window activity events
 * (OV-1304). Designed for a daily worker schedule; safe to run repeatedly.
 * Each purge is independent so one failure does not block the others; failures
 * are logged at error level and listed in `failures` for the worker to act on.
 */
export async function purgePlatformData(
  now = new Date(),
): Promise<PlatformRetentionResult> {
  const { sessionCutoff, verificationCutoff, activityCutoff } =
    computeRetentionCutoffs(now);
  const database = getDatabase();
  const result: PlatformRetentionResult = {
    sessions: 0,
    verifications: 0,
    activityEvents: 0,
    failures: [],
  };

  try {
    const rows = await database
      .delete(session)
      .where(lt(session.expiresAt, sessionCutoff))
      .returning({ id: session.id });
    result.sessions = rows.length;
  } catch (error) {
    reportFailure(result, "sessions", error);
  }

  try {
    const rows = await database
      .delete(verification)
      .where(lt(verification.expiresAt, verificationCutoff))
      .returning({ id: verification.id });
    result.verifications = rows.length;
  } catch (error) {
    reportFailure(result, "verifications", error);
  }

  try {
    const rows = await database
      .delete(businessActivityEvent)
      .where(lt(businessActivityEvent.occurredAt, activityCutoff))
      .returning({ id: businessActivityEvent.id });
    result.activityEvents = rows.length;
  } catch (error) {
    reportFailure(result, "activityEvents", error);
  }

  return result;
}
