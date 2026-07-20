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
        message: "A public address and postcode are required for full visibility.",
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

export type OnboardingProfileDraft = z.infer<
  typeof onboardingProfileDraftSchema
>;
export type OnboardingLocationDraft = z.infer<
  typeof onboardingLocationDraftSchema
>;

export type BusinessOnboardingDraft = {
  businessId: string;
  version: number;
  profile: OnboardingProfileDraft | null;
  location: OnboardingLocationDraft | null;
  updatedAt: Date;
};

export type OnboardingDraftPatch = {
  businessId: string;
  expectedVersion: number;
  profile?: unknown;
  location?: unknown;
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
  draft: Pick<BusinessOnboardingDraft, "profile" | "location">,
): BusinessOnboardingStepKey[] {
  const completed: BusinessOnboardingStepKey[] = [];

  if (draft.profile) completed.push("profile");
  if (draft.location) completed.push("location");

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

  const profileResult =
    patch.profile === undefined
      ? { success: true as const, data: current.profile }
      : onboardingProfileDraftSchema.safeParse(patch.profile);
  const locationResult =
    patch.location === undefined
      ? { success: true as const, data: current.location }
      : onboardingLocationDraftSchema.safeParse(patch.location);

  const issues: OnboardingDraftIssue[] = [
    ...(profileResult.success
      ? []
      : profileResult.error.issues.map(({ message, path }) => ({
          message,
          path,
        }))),
    ...(locationResult.success
      ? []
      : locationResult.error.issues.map(({ message, path }) => ({
          message,
          path,
        }))),
  ];

  if (issues.length > 0) return { status: "invalid", issues };

  return {
    status: "saved",
    draft: {
      businessId: current.businessId,
      version: current.version + 1,
      profile: profileResult.data,
      location: locationResult.data,
      updatedAt: now,
    },
  };
}
