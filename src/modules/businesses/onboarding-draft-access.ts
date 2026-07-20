import "server-only";

import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import type { BusinessOnboardingDraft } from "./onboarding-draft";
import {
  getBusinessOnboardingDraft,
  savePersistedBusinessOnboardingDraft,
  type PersistedOnboardingDraftResult,
} from "./onboarding-draft-repository";

export type OnboardingDraftReadResult =
  | { status: "ready"; draft: BusinessOnboardingDraft | null }
  | { status: "forbidden" }
  | { status: "unavailable" };

export type OnboardingDraftWriteResult =
  | PersistedOnboardingDraftResult
  | { status: "forbidden" }
  | { status: "unavailable" };

/**
 * Reads the onboarding draft for a business after a server-side membership
 * check. Fails closed: any authorisation or database problem hides the draft.
 */
export async function readOnboardingDraftForUser(input: {
  userId: string;
  businessId: string;
}): Promise<OnboardingDraftReadResult> {
  const authorised = await canUserAccessBusiness({
    userId: input.userId,
    businessId: input.businessId,
    permission: businessPermissions.view,
  });

  if (!authorised) return { status: "forbidden" };

  try {
    const draft = await getBusinessOnboardingDraft(input.businessId);
    return { status: "ready", draft };
  } catch {
    return { status: "unavailable" };
  }
}

/**
 * Saves an onboarding draft section after a server-side edit-permission
 * check. Fails closed on missing permission and translates database
 * failures into a bounded unavailable state.
 */
export async function saveOnboardingDraftForUser(input: {
  userId: string;
  businessId: string;
  expectedVersion: number;
  profile?: unknown;
  location?: unknown;
  services?: unknown;
  hours?: unknown;
}): Promise<OnboardingDraftWriteResult> {
  const authorised = await canUserAccessBusiness({
    userId: input.userId,
    businessId: input.businessId,
    permission: businessPermissions.editProfile,
  });

  if (!authorised) return { status: "forbidden" };

  try {
    return await savePersistedBusinessOnboardingDraft({
      businessId: input.businessId,
      expectedVersion: input.expectedVersion,
      ...(input.profile !== undefined ? { profile: input.profile } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.services !== undefined ? { services: input.services } : {}),
      ...(input.hours !== undefined ? { hours: input.hours } : {}),
    });
  } catch {
    return { status: "unavailable" };
  }
}
