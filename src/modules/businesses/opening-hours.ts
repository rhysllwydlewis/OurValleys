import "server-only";

import { and, asc, eq, gte, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  openingHoursException,
  openingHoursRule,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import { DAY_OF_WEEK, toWeeklyRules } from "./draft-promotion";
import {
  onboardingExceptionalHoursDraftSchema,
  onboardingOpeningHoursDraftSchema,
} from "./onboarding-draft";
import {
  validateSpecialDay,
  validateWeeklyHours,
  weekdayOrder,
  type Weekday,
} from "./opening-hours-form";
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
  options: { lock?: boolean } = {},
): Promise<string | null> {
  const query = transaction
    .select({ id: businessLocation.id })
    .from(businessLocation)
    .where(
      and(
        eq(businessLocation.businessId, businessId),
        eq(businessLocation.isPrimary, true),
      ),
    )
    .limit(1);
  // Writes lock the location row so that counting, writing and rebuilding the
  // mirrored draft happen as one step per business: two managers saving at
  // once can neither exceed the limit nor overwrite each other's mirror.
  const [location] = options.lock ? await query.for("update") : await query;
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

async function readWeekly(
  transaction: Pick<Transaction, "select">,
  locationId: string,
): Promise<OwnerWeeklyDay[]> {
  const rules = await transaction
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
  return weekdayOrder.map((day): OwnerWeeklyDay => {
    const rule = byDay.get(DAY_OF_WEEK[day]);
    const closed = !rule || rule.closed || !rule.opensAt || !rule.closesAt;
    return {
      day,
      closed,
      opensAt: closed ? null : (rule?.opensAt ?? null),
      closesAt: closed ? null : (rule?.closesAt ?? null),
    };
  });
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
    const weekly = await readWeekly(database, locationId);
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

/** Order-independent, comparable form of a weekly schedule. */
function weeklyKey(
  days: readonly {
    day: string;
    closed: boolean;
    opensAt: string | null;
    closesAt: string | null;
  }[],
): string {
  return JSON.stringify(
    weekdayOrder.map((name) => {
      const day = days.find((candidate) => candidate.day === name);
      const closed = !day || day.closed;
      return [
        name,
        closed,
        closed ? null : day?.opensAt,
        closed ? null : day?.closesAt,
      ];
    }),
  );
}

/** Order-independent, comparable form of a list of special days. */
function specialDaysKey(
  days: readonly {
    date: string;
    closed: boolean;
    opensAt: string | null;
    closesAt: string | null;
    note?: string | null;
  }[],
  today: string,
): string {
  return JSON.stringify(
    days
      .filter((day) => day.date >= today)
      .map((day) => [
        day.date,
        day.closed,
        day.closed ? null : day.opensAt,
        day.closed ? null : day.closesAt,
        day.note ?? null,
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}

/**
 * Live edits change the canonical record, so the private draft is kept in
 * step: otherwise the dashboard preview, which prefers drafted sections, would
 * keep showing the old hours. But the owner may have staged *different* hours
 * in the draft for a later change, and a routine live correction must not
 * destroy that. So a draft section is mirrored only when it is absent or still
 * identical to the canonical state from before this edit; a diverged section
 * is left exactly as the owner left it. A missing draft row is left alone.
 */
async function mirrorWeeklyIntoDraft(
  transaction: Transaction,
  businessId: string,
  before: OwnerWeeklyDay[],
  after: unknown,
) {
  const [draft] = await transaction
    .select({ hours: businessOnboardingDraft.hours })
    .from(businessOnboardingDraft)
    .where(eq(businessOnboardingDraft.businessId, businessId))
    .for("update")
    .limit(1);
  if (!draft) return;
  const parsed = onboardingOpeningHoursDraftSchema.safeParse(draft.hours);
  // Absent (or unreadable, so not something the owner can see) sections heal.
  const inSync =
    !parsed.success || weeklyKey(parsed.data) === weeklyKey(before);
  if (!inSync) return;
  await transaction
    .update(businessOnboardingDraft)
    .set({
      hours: after,
      version: sql`${businessOnboardingDraft.version} + 1`,
      updatedAt: sql`now()`,
    })
    .where(eq(businessOnboardingDraft.businessId, businessId));
}

async function mirrorSpecialDaysIntoDraft(
  transaction: Transaction,
  businessId: string,
  before: OwnerSpecialDay[],
  after: OwnerSpecialDay[],
  today: string,
) {
  const [draft] = await transaction
    .select({ exceptionalHours: businessOnboardingDraft.exceptionalHours })
    .from(businessOnboardingDraft)
    .where(eq(businessOnboardingDraft.businessId, businessId))
    .for("update")
    .limit(1);
  if (!draft) return;
  const parsed = onboardingExceptionalHoursDraftSchema.safeParse(
    draft.exceptionalHours,
  );
  const inSync =
    !parsed.success ||
    specialDaysKey(parsed.data, today) === specialDaysKey(before, today);
  if (!inSync) return;
  await transaction
    .update(businessOnboardingDraft)
    .set({
      exceptionalHours: after.map((day) => ({
        date: day.date,
        closed: day.closed,
        opensAt: day.opensAt,
        closesAt: day.closesAt,
        note: day.note,
      })),
      version: sql`${businessOnboardingDraft.version} + 1`,
      updatedAt: sql`now()`,
    })
    .where(eq(businessOnboardingDraft.businessId, businessId));
}

/**
 * The public page shows "Last updated" from the business row, so a live hours
 * change has to advance it in the same transaction.
 */
async function touchBusiness(transaction: Transaction, businessId: string) {
  await transaction
    .update(business)
    .set({ updatedAt: sql`now()` })
    .where(eq(business.id, businessId));
}

export type SaveHoursResult =
  "saved" | "invalid" | "no_location" | "limit" | "unavailable";

export async function saveWeeklyOpeningHours(input: {
  businessId: string;
  hours: unknown;
}): Promise<SaveHoursResult> {
  const validated = validateWeeklyHours(input.hours);
  if (!validated.ok) return "invalid";
  const parsed = { data: validated.data };
  try {
    return await getDatabase().transaction(async (transaction) => {
      const locationId = await findPrimaryLocationId(
        transaction,
        input.businessId,
        { lock: true },
      );
      if (!locationId) return "no_location" as const;
      const before = await readWeekly(transaction, locationId);
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
      await touchBusiness(transaction, input.businessId);
      await mirrorWeeklyIntoDraft(
        transaction,
        input.businessId,
        before,
        parsed.data,
      );
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
  const today = londonDateString(input.now ?? new Date());
  // Includes the rule that a past date is refused: it can never apply and
  // would only be pruned later.
  const validated = validateSpecialDay(input.specialDay, today);
  if (!validated.ok) return "invalid";
  const parsed = { data: validated.data };
  try {
    return await getDatabase().transaction(async (transaction) => {
      const locationId = await findPrimaryLocationId(
        transaction,
        input.businessId,
        { lock: true },
      );
      if (!locationId) return "no_location" as const;

      const before = await listUpcomingSpecialDays(
        transaction,
        locationId,
        today,
      );
      const replacing = before.some((day) => day.date === parsed.data.date);
      if (!replacing && before.length >= MAX_UPCOMING_EXCEPTIONS) {
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

      const after = await listUpcomingSpecialDays(
        transaction,
        locationId,
        today,
      );
      await touchBusiness(transaction, input.businessId);
      await mirrorSpecialDaysIntoDraft(
        transaction,
        input.businessId,
        before,
        after,
        today,
      );
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
        { lock: true },
      );
      if (!locationId) return "not_found" as const;
      const before = await listUpcomingSpecialDays(
        transaction,
        locationId,
        today,
      );
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
      const after = await listUpcomingSpecialDays(
        transaction,
        locationId,
        today,
      );
      await touchBusiness(transaction, input.businessId);
      await mirrorSpecialDaysIntoDraft(
        transaction,
        input.businessId,
        before,
        after,
        today,
      );
      return "removed" as const;
    });
  } catch {
    return "unavailable";
  }
}
