import "server-only";

import { and, asc, eq, gte, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  businessLocation,
  openingHoursException,
  openingHoursRule,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import { DAY_OF_WEEK, toWeeklyRules } from "./draft-promotion";
import {
  onboardingExceptionalHoursDaySchema,
  onboardingOpeningHoursDraftSchema,
} from "./onboarding-draft";
import { weekdayOrder, type Weekday } from "./opening-hours-form";
import { londonDateString } from "./opening-hours-exceptions";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

/** Upper bound on upcoming special days per location, matching the draft. */
export const MAX_UPCOMING_EXCEPTIONS = 60;

export type OwnerWeeklyDay = {
  day: Weekday;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type OwnerSpecialDay = {
  date: string;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
};

export type OwnerOpeningHours =
  | {
      state: "ready";
      /** False until the business has been published and has a location. */
      hasLocation: boolean;
      weekly: OwnerWeeklyDay[];
      specialDays: OwnerSpecialDay[];
    }
  | { state: "unavailable" };

/**
 * The location is always resolved from the business id, never accepted from
 * the caller, so a request for one business can never touch another's hours.
 */
async function findPrimaryLocationId(
  transaction: Pick<Transaction, "select">,
  businessId: string,
): Promise<string | null> {
  const [location] = await transaction
    .select({ id: businessLocation.id })
    .from(businessLocation)
    .where(
      and(
        eq(businessLocation.businessId, businessId),
        eq(businessLocation.isPrimary, true),
      ),
    )
    .limit(1);
  return location?.id ?? null;
}

async function listUpcomingSpecialDays(
  transaction: Pick<Transaction, "select">,
  locationId: string,
  today: string,
): Promise<OwnerSpecialDay[]> {
  return transaction
    .select({
      date: openingHoursException.date,
      closed: openingHoursException.isClosed,
      opensAt: openingHoursException.opensAt,
      closesAt: openingHoursException.closesAt,
      note: openingHoursException.note,
    })
    .from(openingHoursException)
    .where(
      and(
        eq(openingHoursException.businessLocationId, locationId),
        gte(openingHoursException.date, today),
      ),
    )
    .orderBy(asc(openingHoursException.date));
}

export async function getOwnerOpeningHours(
  businessId: string,
  now = new Date(),
): Promise<OwnerOpeningHours> {
  try {
    const database = getDatabase();
    const locationId = await findPrimaryLocationId(database, businessId);
    if (!locationId) {
      return {
        state: "ready",
        hasLocation: false,
        weekly: [],
        specialDays: [],
      };
    }
    const rules = await database
      .select({
        dayOfWeek: openingHoursRule.dayOfWeek,
        closed: openingHoursRule.isClosed,
        opensAt: openingHoursRule.opensAt,
        closesAt: openingHoursRule.closesAt,
      })
      .from(openingHoursRule)
      .where(eq(openingHoursRule.businessLocationId, locationId));
    const byDay = new Map(rules.map((rule) => [rule.dayOfWeek, rule]));
    // A weekday with no rule row is shown as closed so every day is editable.
    const weekly = weekdayOrder.map((day): OwnerWeeklyDay => {
      const rule = byDay.get(DAY_OF_WEEK[day]);
      const closed = !rule || rule.closed || !rule.opensAt || !rule.closesAt;
      return {
        day,
        closed,
        opensAt: closed ? null : (rule?.opensAt ?? null),
        closesAt: closed ? null : (rule?.closesAt ?? null),
      };
    });
    const specialDays = await listUpcomingSpecialDays(
      database,
      locationId,
      londonDateString(now),
    );
    return { state: "ready", hasLocation: true, weekly, specialDays };
  } catch {
    return { state: "unavailable" };
  }
}

/**
 * Live edits change the canonical record, so the private draft is kept in
 * step. Otherwise the dashboard preview, which prefers drafted sections,
 * would keep showing the old hours. A missing draft row is left alone.
 */
async function mirrorIntoDraft(
  transaction: Transaction,
  businessId: string,
  patch: { hours?: unknown; exceptionalHours?: unknown },
) {
  await transaction
    .update(businessOnboardingDraft)
    .set({
      ...patch,
      version: sql`${businessOnboardingDraft.version} + 1`,
      updatedAt: sql`now()`,
    })
    .where(eq(businessOnboardingDraft.businessId, businessId));
}

export type SaveHoursResult =
  "saved" | "invalid" | "no_location" | "limit" | "unavailable";

export async function saveWeeklyOpeningHours(input: {
  businessId: string;
  hours: unknown;
}): Promise<SaveHoursResult> {
  const parsed = onboardingOpeningHoursDraftSchema.safeParse(input.hours);
  if (!parsed.success) return "invalid";
  try {
    return await getDatabase().transaction(async (transaction) => {
      const locationId = await findPrimaryLocationId(
        transaction,
        input.businessId,
      );
      if (!locationId) return "no_location" as const;
      for (const rule of toWeeklyRules(parsed.data)) {
        await transaction
          .insert(openingHoursRule)
          .values({ businessLocationId: locationId, ...rule })
          .onConflictDoUpdate({
            target: [
              openingHoursRule.businessLocationId,
              openingHoursRule.dayOfWeek,
            ],
            set: {
              isClosed: rule.isClosed,
              opensAt: rule.opensAt,
              closesAt: rule.closesAt,
              updatedAt: sql`now()`,
            },
          });
      }
      await mirrorIntoDraft(transaction, input.businessId, {
        hours: parsed.data,
      });
      return "saved" as const;
    });
  } catch {
    return "unavailable";
  }
}

export async function saveSpecialDay(input: {
  businessId: string;
  specialDay: unknown;
  now?: Date;
}): Promise<SaveHoursResult> {
  const parsed = onboardingExceptionalHoursDaySchema.safeParse(
    input.specialDay,
  );
  if (!parsed.success) return "invalid";
  const today = londonDateString(input.now ?? new Date());
  // A past date can never apply and would only be pruned later.
  if (parsed.data.date < today) return "invalid";
  try {
    return await getDatabase().transaction(async (transaction) => {
      const locationId = await findPrimaryLocationId(
        transaction,
        input.businessId,
      );
      if (!locationId) return "no_location" as const;

      const upcoming = await listUpcomingSpecialDays(
        transaction,
        locationId,
        today,
      );
      const replacing = upcoming.some((day) => day.date === parsed.data.date);
      if (!replacing && upcoming.length >= MAX_UPCOMING_EXCEPTIONS) {
        return "limit" as const;
      }

      const values = {
        isClosed: parsed.data.closed,
        opensAt: parsed.data.closed ? null : parsed.data.opensAt,
        closesAt: parsed.data.closed ? null : parsed.data.closesAt,
        note: parsed.data.note ?? null,
      };
      await transaction
        .insert(openingHoursException)
        .values({
          businessLocationId: locationId,
          date: parsed.data.date,
          ...values,
        })
        .onConflictDoUpdate({
          target: [
            openingHoursException.businessLocationId,
            openingHoursException.date,
          ],
          set: { ...values, updatedAt: sql`now()` },
        });

      await mirrorSpecialDays(transaction, input.businessId, locationId, today);
      return "saved" as const;
    });
  } catch {
    return "unavailable";
  }
}

export async function removeSpecialDay(input: {
  businessId: string;
  date: string;
  now?: Date;
}): Promise<"removed" | "not_found" | "invalid" | "unavailable"> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "invalid";
  const today = londonDateString(input.now ?? new Date());
  try {
    return await getDatabase().transaction(async (transaction) => {
      const locationId = await findPrimaryLocationId(
        transaction,
        input.businessId,
      );
      if (!locationId) return "not_found" as const;
      const removed = await transaction
        .delete(openingHoursException)
        .where(
          and(
            eq(openingHoursException.businessLocationId, locationId),
            eq(openingHoursException.date, input.date),
          ),
        )
        .returning({ id: openingHoursException.id });
      if (removed.length === 0) return "not_found" as const;
      await mirrorSpecialDays(transaction, input.businessId, locationId, today);
      return "removed" as const;
    });
  } catch {
    return "unavailable";
  }
}

async function mirrorSpecialDays(
  transaction: Transaction,
  businessId: string,
  locationId: string,
  today: string,
) {
  const days = await listUpcomingSpecialDays(transaction, locationId, today);
  await mirrorIntoDraft(transaction, businessId, {
    exceptionalHours: days.map((day) => ({
      date: day.date,
      closed: day.closed,
      opensAt: day.opensAt,
      closesAt: day.closesAt,
      note: day.note,
    })),
  });
}
