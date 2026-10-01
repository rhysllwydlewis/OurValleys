import "server-only";

import { and, eq, notInArray, sql } from "drizzle-orm";
import type { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  openingHoursException,
  openingHoursRule,
  service,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import {
  onboardingExceptionalHoursDraftSchema,
  onboardingLocationDraftSchema,
  onboardingOpeningHoursDraftSchema,
  onboardingProfileDraftSchema,
  onboardingServicesDraftSchema,
  type OnboardingExceptionalHoursDraft,
  type OnboardingLocationDraft,
  type OnboardingOpeningHoursDraft,
  type OnboardingProfileDraft,
  type OnboardingServicesDraft,
} from "./onboarding-draft";
import { londonDateString } from "./opening-hours-exceptions";

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

/** `opening_hours_rule.day_of_week` uses 0 = Sunday, matching public.ts. */
const DAY_OF_WEEK: Record<OnboardingOpeningHoursDraft[number]["day"], number> =
  {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

export type PromotableDraft = {
  profile: OnboardingProfileDraft;
  location: OnboardingLocationDraft;
  services: OnboardingServicesDraft;
  hours: OnboardingOpeningHoursDraft;
  exceptionalHours: OnboardingExceptionalHoursDraft;
};

/**
 * Re-validates the stored draft sections against the same schemas used when
 * they were saved. Returns null unless every required section is present and
 * valid, so a stale or hand-edited row can never be promoted half-complete.
 * Exceptional hours are optional and default to none.
 */
export function parsePromotableDraft(row: {
  profile: unknown;
  location: unknown;
  services: unknown;
  hours: unknown;
  exceptionalHours: unknown;
}): PromotableDraft | null {
  const profile = onboardingProfileDraftSchema.safeParse(row.profile);
  const location = onboardingLocationDraftSchema.safeParse(row.location);
  const services = onboardingServicesDraftSchema.safeParse(row.services);
  const hours = onboardingOpeningHoursDraftSchema.safeParse(row.hours);
  const exceptions =
    row.exceptionalHours == null
      ? { success: true as const, data: [] }
      : onboardingExceptionalHoursDraftSchema.safeParse(row.exceptionalHours);
  if (
    !profile.success ||
    !location.success ||
    !services.success ||
    !hours.success ||
    !exceptions.success
  ) {
    return null;
  }
  return {
    profile: profile.data,
    location: location.data,
    services: services.data,
    hours: hours.data,
    exceptionalHours: exceptions.data,
  };
}

export function toWeeklyRules(hours: OnboardingOpeningHoursDraft) {
  return hours.map((day) => ({
    dayOfWeek: DAY_OF_WEEK[day.day],
    isClosed: day.closed,
    opensAt: day.closed ? null : day.opensAt,
    closesAt: day.closed ? null : day.closesAt,
  }));
}

/** Only dates from today (London) onwards are worth promoting. */
export function upcomingExceptions(
  exceptions: OnboardingExceptionalHoursDraft,
  now = new Date(),
) {
  const today = londonDateString(now);
  return exceptions
    .filter((day) => day.date >= today)
    .map((day) => ({
      date: day.date,
      isClosed: day.closed,
      opensAt: day.closed ? null : day.opensAt,
      closesAt: day.closed ? null : day.closesAt,
      note: day.note ?? null,
    }));
}

export type PromotionResult = { status: "promoted" } | { status: "incomplete" };

/**
 * Copies a business's onboarding draft into its canonical record: profile
 * fields on the business, the primary location, services, weekly opening
 * hours and upcoming special days. Must run inside the transaction that
 * publishes the business, so a business is never published without them.
 *
 * Idempotent and replace-style: it is only used on the path to publication
 * (draft or rejected businesses), when no live edits can exist yet. Services
 * that are no longer drafted are set to `inactive` rather than deleted.
 * Returns `incomplete`, changing nothing, when the draft is missing or invalid.
 */
export async function promoteOnboardingDraft(
  transaction: Transaction,
  businessId: string,
  now = new Date(),
): Promise<PromotionResult> {
  const [row] = await transaction
    .select({
      profile: businessOnboardingDraft.profile,
      location: businessOnboardingDraft.location,
      services: businessOnboardingDraft.services,
      hours: businessOnboardingDraft.hours,
      exceptionalHours: businessOnboardingDraft.exceptionalHours,
    })
    .from(businessOnboardingDraft)
    .where(eq(businessOnboardingDraft.businessId, businessId))
    .limit(1);
  if (!row) return { status: "incomplete" };
  const draft = parsePromotableDraft(row);
  if (!draft) return { status: "incomplete" };

  await transaction
    .update(business)
    .set({
      tradingName: draft.profile.tradingName,
      summary: draft.profile.summary,
      // The generated site renders `description` ahead of `summary`, so an
      // empty description would blank the About text. Seed it from the summary
      // once; later owner-written descriptions are never overwritten.
      description: sql`case when ${business.description} = '' then ${draft.profile.summary} else ${business.description} end`,
      publicPhone: draft.profile.publicPhone,
      publicEmail: draft.profile.publicEmail,
      updatedAt: sql`now()`,
    })
    .where(eq(business.id, businessId));

  const locationValues = {
    placeId: draft.location.placeId,
    locationType: draft.location.locationType,
    publicAddressVisibility: draft.location.publicAddressVisibility,
    publicAddressLineOne: draft.location.publicAddressLineOne,
    publicLocality: draft.location.publicLocality,
    publicPostcode: draft.location.publicPostcode,
    privateAddressLineOne: draft.location.privateAddressLineOne,
    privatePostcode: draft.location.privatePostcode,
  };
  const [existingLocation] = await transaction
    .select({ id: businessLocation.id })
    .from(businessLocation)
    .where(
      and(
        eq(businessLocation.businessId, businessId),
        eq(businessLocation.isPrimary, true),
      ),
    )
    .limit(1);
  let locationId = existingLocation?.id;
  if (locationId) {
    await transaction
      .update(businessLocation)
      .set({ ...locationValues, status: "active", updatedAt: sql`now()` })
      .where(eq(businessLocation.id, locationId));
  } else {
    const [created] = await transaction
      .insert(businessLocation)
      .values({ businessId, ...locationValues, isPrimary: true })
      .returning({ id: businessLocation.id });
    locationId = created?.id;
  }
  if (!locationId) throw new Error("Primary location was not created.");

  const draftedNames = draft.services.map((item) => item.name);
  for (const [index, item] of draft.services.entries()) {
    await transaction
      .insert(service)
      .values({
        businessId,
        name: item.name,
        description: item.description ?? "",
        priceDisplay: item.priceGuidance,
        status: "active",
        sortOrder: index,
      })
      .onConflictDoUpdate({
        target: [service.businessId, service.name],
        set: {
          description: item.description ?? "",
          priceDisplay: item.priceGuidance,
          status: "active",
          sortOrder: index,
          updatedAt: sql`now()`,
        },
      });
  }
  await transaction
    .update(service)
    .set({ status: "inactive", updatedAt: sql`now()` })
    .where(
      and(
        eq(service.businessId, businessId),
        notInArray(service.name, draftedNames),
      ),
    );

  for (const rule of toWeeklyRules(draft.hours)) {
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

  const exceptions = upcomingExceptions(draft.exceptionalHours, now);
  const exceptionDates = exceptions.map((item) => item.date);
  await transaction
    .delete(openingHoursException)
    .where(
      exceptionDates.length > 0
        ? and(
            eq(openingHoursException.businessLocationId, locationId),
            notInArray(openingHoursException.date, exceptionDates),
          )
        : eq(openingHoursException.businessLocationId, locationId),
    );
  for (const item of exceptions) {
    await transaction
      .insert(openingHoursException)
      .values({ businessLocationId: locationId, ...item })
      .onConflictDoUpdate({
        target: [
          openingHoursException.businessLocationId,
          openingHoursException.date,
        ],
        set: {
          isClosed: item.isClosed,
          opensAt: item.opensAt,
          closesAt: item.closesAt,
          note: item.note,
          updatedAt: sql`now()`,
        },
      });
  }

  return { status: "promoted" };
}
