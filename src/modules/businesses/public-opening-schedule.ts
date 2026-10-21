import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  businessLocation,
  openingHoursException,
  openingHoursRule,
} from "@/lib/database/schema/business";
import {
  addDaysToDateString,
  londonDateString,
} from "./opening-hours-exceptions";
import {
  NEXT_OPENING_LOOKAHEAD_DAYS,
  buildSchedule,
  type OpeningSchedule,
} from "./opening-status";

/** How far ahead special days are sent to the browser for live status. */
const SCHEDULE_HORIZON_DAYS = NEXT_OPENING_LOOKAHEAD_DAYS + 7;

/**
 * The structured weekly hours and upcoming special days of a published
 * business's primary location, for the live "open now" status. Hours and
 * special-day notes are already public on the business page; nothing private
 * is selected. The location is resolved from the business id, never from the
 * caller. Returns null when the hours cannot be read, so the page falls back
 * to the static list rather than failing.
 */
export async function getPublicOpeningSchedule(
  businessId: string,
  now = new Date(),
): Promise<OpeningSchedule | null> {
  try {
    const database = getDatabase();
    const [location] = await database
      .select({ id: businessLocation.id })
      .from(businessLocation)
      .where(
        and(
          eq(businessLocation.businessId, businessId),
          eq(businessLocation.isPrimary, true),
        ),
      )
      .limit(1);
    if (!location) return null;
    const today = londonDateString(now);
    const [weekly, exceptions] = await Promise.all([
      database
        .select({
          dayOfWeek: openingHoursRule.dayOfWeek,
          isClosed: openingHoursRule.isClosed,
          opensAt: openingHoursRule.opensAt,
          closesAt: openingHoursRule.closesAt,
        })
        .from(openingHoursRule)
        .where(eq(openingHoursRule.businessLocationId, location.id)),
      database
        .select({
          date: openingHoursException.date,
          isClosed: openingHoursException.isClosed,
          opensAt: openingHoursException.opensAt,
          closesAt: openingHoursException.closesAt,
          note: openingHoursException.note,
        })
        .from(openingHoursException)
        .where(
          and(
            eq(openingHoursException.businessLocationId, location.id),
            gte(openingHoursException.date, today),
            lte(
              openingHoursException.date,
              addDaysToDateString(today, SCHEDULE_HORIZON_DAYS),
            ),
          ),
        )
        .orderBy(asc(openingHoursException.date)),
    ]);
    return buildSchedule(weekly, exceptions);
  } catch {
    return null;
  }
}
