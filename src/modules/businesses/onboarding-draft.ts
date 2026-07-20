import { z } from "zod";
import type { BusinessOnboardingStepKey } from "./onboarding";

const optionalPublicText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const optionalEmail = z
  .union([z.email().max(254), z.literal("")])
  .nullable()
  .optional()
  .transform((value) => (value ? value.toLowerCase() : null));

export const onboardingProfileDraftSchema = z.object({
  tradingName: z.string().trim().min(2).max(120),
  summary: z.string().trim().min(20).max(280),
  publicPhone: optionalPublicText(40),
  publicEmail: optionalEmail,
});

export const onboardingLocationDraftSchema = z
  .object({
    placeId: z.uuid(),
    locationType: z.enum(["premises", "service_area", "online"]),
    publicAddressVisibility: z.enum([
      "full_address",
      "locality_only",
      "service_area_only",
    ]),
    publicAddressLineOne: optionalPublicText(160),
    publicLocality: optionalPublicText(120),
    publicPostcode: optionalPublicText(16),
    privateAddressLineOne: optionalPublicText(160),
    privatePostcode: optionalPublicText(16),
  })
  .superRefine((value, context) => {
    if (
      value.publicAddressVisibility === "full_address" &&
      (!value.publicAddressLineOne || !value.publicPostcode)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A public address and postcode are required for full visibility.",
        path: ["publicAddressVisibility"],
      });
    }

    if (
      value.locationType === "premises" &&
      (!value.privateAddressLineOne || !value.privatePostcode)
    ) {
      context.addIssue({
        code: "custom",
        message: "A private premises address and postcode are required.",
        path: ["privateAddressLineOne"],
      });
    }
  });

const onboardingServiceDraftSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: optionalPublicText(280),
  priceGuidance: optionalPublicText(80),
});

export const onboardingServicesDraftSchema = z
  .array(onboardingServiceDraftSchema)
  .min(1)
  .max(20)
  .superRefine((services, context) => {
    const names = new Set<string>();
    services.forEach((service, index) => {
      const normalisedName = service.name.toLocaleLowerCase("en-GB");
      if (names.has(normalisedName)) {
        context.addIssue({
          code: "custom",
          message: "Service names must be unique.",
          path: [index, "name"],
        });
      }
      names.add(normalisedName);
    });
  });

const weekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date must be a valid ISO calendar date.");

const openingWindowSchema = z
  .object({
    closed: z.boolean(),
    opensAt: timeSchema.nullable(),
    closesAt: timeSchema.nullable(),
  })
  .superRefine((value, context) => {
    if (value.closed) {
      if (value.opensAt !== null || value.closesAt !== null) {
        context.addIssue({
          code: "custom",
          message: "Closed days cannot include opening times.",
          path: ["closed"],
        });
      }
      return;
    }

    if (!value.opensAt || !value.closesAt) {
      context.addIssue({
        code: "custom",
        message: "Open days require opening and closing times.",
        path: ["opensAt"],
      });
      return;
    }

    if (value.opensAt >= value.closesAt) {
      context.addIssue({
        code: "custom",
        message: "Closing time must be later than opening time.",
        path: ["closesAt"],
      });
    }
  });

const openingHoursDaySchema = openingWindowSchema.extend({ day: weekdaySchema });

export const onboardingOpeningHoursDraftSchema = z
  .array(openingHoursDaySchema)
  .length(7)
  .superRefine((days, context) => {
    const present = new Set(days.map((day) => day.day));
    if (present.size !== 7) {
      context.addIssue({
        code: "custom",
        message: "Opening hours must include each weekday exactly once.",
        path: [],
      });
    }
  });

const exceptionalHoursDaySchema = openingWindowSchema.extend({
  date: isoDateSchema,
  note: optionalPublicText(120),
});

export const onboardingExceptionalHoursDraftSchema = z
  .array(exceptionalHoursDaySchema)
  .max(60)
  .superRefine((days, context) => {
    const dates = new Set<string>();
    days.forEach((day, index) => {
      if (dates.has(day.date)) {
        context.addIssue({
          code: "custom",
          message: "Exceptional opening-hour dates must be unique.",
          path: [index, "date"],
        });
      }
      dates.add(day.date);
    });
  });

export type OnboardingProfileDraft = z.infer<
  typeof onboardingProfileDraftSchema
>;
export type OnboardingLocationDraft = z.infer<
  typeof onboardingLocationDraftSchema
>;
export type OnboardingServicesDraft = z.infer<
  typeof onboardingServicesDraftSchema
>;
export type OnboardingOpeningHoursDraft = z.infer<
  typeof onboardingOpeningHoursDraftSchema
>;
export type OnboardingExceptionalHoursDraft = z.infer<
  typeof onboardingExceptionalHoursDraftSchema
>;

export type BusinessOnboardingDraft = {
  businessId: string;
  version: number;
  profile: OnboardingProfileDraft | null;
  location: OnboardingLocationDraft | null;
  services: OnboardingServicesDraft | null;
  hours: OnboardingOpeningHoursDraft | null;
  exceptionalHours: OnboardingExceptionalHoursDraft | null;
  updatedAt: Date;
};

export type OnboardingDraftPatch = {
  businessId: string;
  expectedVersion: number;
  profile?: unknown;
  location?: unknown;
  services?: unknown;
  hours?: unknown;
  exceptionalHours?: unknown;
};

export type OnboardingDraftIssue = {
  path: PropertyKey[];
  message: string;
};

export type OnboardingDraftSaveResult =
  | { status: "saved"; draft: BusinessOnboardingDraft }
  | { status: "conflict"; currentVersion: number }
  | { status: "invalid"; issues: OnboardingDraftIssue[] };

export function deriveCompletedOnboardingSteps(
  draft: Pick<
    BusinessOnboardingDraft,
    "profile" | "location" | "services" | "hours"
  >,
): BusinessOnboardingStepKey[] {
  const completed: BusinessOnboardingStepKey[] = [];

  if (draft.profile) completed.push("profile");
  if (draft.location) completed.push("location");
  if (draft.services) completed.push("services");
  if (draft.hours) completed.push("hours");

  return completed;
}

export function saveBusinessOnboardingDraft(
  current: BusinessOnboardingDraft,
  patch: OnboardingDraftPatch,
  now = new Date(),
): OnboardingDraftSaveResult {
  if (patch.businessId !== current.businessId) {
    return {
      status: "invalid",
      issues: [
        {
          message: "The draft does not belong to the requested business.",
          path: ["businessId"],
        },
      ],
    };
  }

  if (patch.expectedVersion !== current.version) {
    return { status: "conflict", currentVersion: current.version };
  }

  let profile = current.profile;
  let location = current.location;
  let services = current.services;
  let hours = current.hours;
  let exceptionalHours = current.exceptionalHours;
  const issues: OnboardingDraftIssue[] = [];

  const validateSection = <T>(
    value: unknown,
    schema: z.ZodType<T>,
    assign: (validated: T) => void,
  ) => {
    const result = schema.safeParse(value);
    if (result.success) {
      assign(result.data);
    } else {
      issues.push(
        ...result.error.issues.map(({ message, path }) => ({ message, path })),
      );
    }
  };

  if (patch.profile !== undefined) {
    validateSection(patch.profile, onboardingProfileDraftSchema, (value) => {
      profile = value;
    });
  }

  if (patch.location !== undefined) {
    validateSection(patch.location, onboardingLocationDraftSchema, (value) => {
      location = value;
    });
  }

  if (patch.services !== undefined) {
    validateSection(patch.services, onboardingServicesDraftSchema, (value) => {
      services = value;
    });
  }

  if (patch.hours !== undefined) {
    validateSection(patch.hours, onboardingOpeningHoursDraftSchema, (value) => {
      hours = value;
    });
  }

  if (patch.exceptionalHours !== undefined) {
    validateSection(
      patch.exceptionalHours,
      onboardingExceptionalHoursDraftSchema,
      (value) => {
        exceptionalHours = value;
      },
    );
  }

  if (issues.length > 0) return { status: "invalid", issues };

  return {
    status: "saved",
    draft: {
      businessId: current.businessId,
      version: current.version + 1,
      profile,
      location,
      services,
      hours,
      exceptionalHours,
      updatedAt: now,
    },
  };
}
