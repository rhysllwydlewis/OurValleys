import { and, lt, ne, sql } from "drizzle-orm";
import { pruneReadNotifications } from "@/modules/residents/notifications";
import { getDatabase } from "@/lib/database/client";
import { session, verification } from "@/lib/database/schema/auth";
import { openingHoursException } from "@/lib/database/schema/business";
import { placeSuggestion } from "@/lib/database/schema/reference";
import {
  businessActivityEvent,
  businessSuggestion,
  editorialView,
  emailDeliveryLog,
  searchZeroResult,
  unmetDemandDismissal,
} from "@/lib/database/schema/business-operations";
import {
  addDaysToDateString,
  londonDateString,
} from "@/modules/businesses/opening-hours-exceptions";

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

/**
 * Special opening-hours days are useless once their date has passed, so they
 * are removed a month later rather than accumulating forever.
 */
export const OPENING_EXCEPTION_GRACE_DAYS = 30;

/** Zero-result search text is only useful for recent coverage decisions. */
export const ZERO_RESULT_SEARCH_RETENTION_DAYS = 90;

/** Resident business suggestions can carry an email, so they expire. */
export const BUSINESS_SUGGESTION_RETENTION_MONTHS = 12;

/** Delivery outcomes only matter while an admin can still act on them. */
export const EMAIL_DELIVERY_LOG_RETENTION_DAYS = 90;

import { EDITORIAL_VIEW_RETENTION_DAYS } from "./editorial-insights-model";

const DAY_MS = 86_400_000;

export function computeRetentionCutoffs(now: Date) {
  const activityCutoff = new Date(now);
  activityCutoff.setUTCMonth(
    activityCutoff.getUTCMonth() - ACTIVITY_EVENT_RETENTION_MONTHS,
  );
  const suggestionCutoff = new Date(now);
  suggestionCutoff.setUTCMonth(
    suggestionCutoff.getUTCMonth() - BUSINESS_SUGGESTION_RETENTION_MONTHS,
  );
  return {
    editorialViewCutoff: new Date(
      now.getTime() - EDITORIAL_VIEW_RETENTION_DAYS * DAY_MS,
    ),
    suggestionCutoff,
    emailDeliveryCutoff: new Date(
      now.getTime() - EMAIL_DELIVERY_LOG_RETENTION_DAYS * DAY_MS,
    ),
    zeroResultCutoff: new Date(
      now.getTime() - ZERO_RESULT_SEARCH_RETENTION_DAYS * DAY_MS,
    ),
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
  editorialViews: number;
  openingExceptions: number;
  zeroResultSearches: number;
  emailDeliveries: number;
  businessSuggestions: number;
  placeSuggestions: number;
  readNotifications: number;
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
  const {
    sessionCutoff,
    verificationCutoff,
    activityCutoff,
    zeroResultCutoff,
    emailDeliveryCutoff,
    suggestionCutoff,
    editorialViewCutoff,
  } = computeRetentionCutoffs(now);
  const database = getDatabase();
  const result: PlatformRetentionResult = {
    sessions: 0,
    verifications: 0,
    activityEvents: 0,
    editorialViews: 0,
    openingExceptions: 0,
    zeroResultSearches: 0,
    emailDeliveries: 0,
    businessSuggestions: 0,
    placeSuggestions: 0,
    readNotifications: 0,
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

  try {
    const rows = await database
      .delete(editorialView)
      .where(lt(editorialView.viewedAt, editorialViewCutoff))
      .returning({ id: editorialView.id });
    result.editorialViews = rows.length;
  } catch (error) {
    reportFailure(result, "editorialViews", error);
  }

  try {
    const rows = await database
      .delete(searchZeroResult)
      .where(lt(searchZeroResult.occurredAt, zeroResultCutoff))
      .returning({ id: searchZeroResult.id });
    result.zeroResultSearches = rows.length;
    // Decisions about searches that have aged out have nothing left to hide.
    await database
      .delete(unmetDemandDismissal)
      .where(lt(unmetDemandDismissal.dismissedAt, zeroResultCutoff));
  } catch (error) {
    reportFailure(result, "zeroResultSearches", error);
  }

  try {
    const rows = await database
      .delete(emailDeliveryLog)
      .where(lt(emailDeliveryLog.occurredAt, emailDeliveryCutoff))
      .returning({ id: emailDeliveryLog.id });
    result.emailDeliveries = rows.length;
  } catch (error) {
    reportFailure(result, "emailDeliveries", error);
  }

  try {
    const rows = await database
      .delete(businessSuggestion)
      .where(lt(businessSuggestion.createdAt, suggestionCutoff))
      .returning({ id: businessSuggestion.id });
    result.businessSuggestions = rows.length;
  } catch (error) {
    reportFailure(result, "businessSuggestions", error);
  }

  // Decided place suggestions are removed twelve months after the decision; suggestions
  // still waiting for an admin are kept so nothing unread is lost.
  try {
    const rows = await database
      .delete(placeSuggestion)
      .where(
        and(
          ne(placeSuggestion.status, "new"),
          lt(placeSuggestion.reviewedAt, suggestionCutoff),
        ),
      )
      .returning({ id: placeSuggestion.id });
    result.placeSuggestions = rows.length;
  } catch (error) {
    reportFailure(result, "placeSuggestions", error);
  }

  try {
    result.readNotifications = await pruneReadNotifications(now);
  } catch (error) {
    reportFailure(result, "readNotifications", error);
  }

  try {
    const cutoff = addDaysToDateString(
      londonDateString(now),
      -OPENING_EXCEPTION_GRACE_DAYS,
    );
    const rows = await database
      .delete(openingHoursException)
      .where(lt(openingHoursException.date, cutoff))
      .returning({ id: openingHoursException.id });
    result.openingExceptions = rows.length;

    // Live edits mirror special days into the owner's private draft, so the
    // expired ones must go from there too or they would linger for ever and
    // count towards the draft's own limit. Only entries older than the cutoff
    // are removed; drafts without any are left untouched. The version advances
    // with the rewrite so an editor left open since before the purge gets a
    // conflict on its next save instead of silently putting the expired
    // entries back.
    await database.execute(sql`
      update business_onboarding_draft
      set exceptional_hours = coalesce(
        (
          select jsonb_agg(entry order by entry->>'date')
          from jsonb_array_elements(exceptional_hours) as entry
          where entry->>'date' >= ${cutoff}
        ),
        '[]'::jsonb
      ),
      version = version + 1,
      updated_at = now()
      where jsonb_typeof(exceptional_hours) = 'array'
        and exists (
          select 1
          from jsonb_array_elements(exceptional_hours) as entry
          where entry->>'date' < ${cutoff}
        )
    `);
  } catch (error) {
    reportFailure(result, "openingExceptions", error);
  }

  return result;
}
