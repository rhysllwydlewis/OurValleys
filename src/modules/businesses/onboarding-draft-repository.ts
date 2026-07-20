import "server-only";

import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import {
  saveBusinessOnboardingDraft,
  type BusinessOnboardingDraft,
  type OnboardingDraftPatch,
  type OnboardingDraftSaveResult,
  type OnboardingLocationDraft,
  type OnboardingOpeningHoursDraft,
  type OnboardingProfileDraft,
  type OnboardingServicesDraft,
} from "./onboarding-draft";

export type PersistedOnboardingDraftResult =
  OnboardingDraftSaveResult | { status: "missing" };

function toDomainDraft(
  row: typeof businessOnboardingDraft.$inferSelect,
): BusinessOnboardingDraft {
  return {
    businessId: row.businessId,
    version: row.version,
    profile: row.profile as OnboardingProfileDraft | null,
    location: row.location as OnboardingLocationDraft | null,
    services: row.services as OnboardingServicesDraft | null,
    hours: row.hours as OnboardingOpeningHoursDraft | null,
    updatedAt: row.updatedAt,
  };
}

export async function getBusinessOnboardingDraft(
  businessId: string,
): Promise<BusinessOnboardingDraft | null> {
  const database = getDatabase();
  const [row] = await database
    .select()
    .from(businessOnboardingDraft)
    .where(eq(businessOnboardingDraft.businessId, businessId))
    .limit(1);

  return row ? toDomainDraft(row) : null;
}

export async function savePersistedBusinessOnboardingDraft(
  patch: OnboardingDraftPatch,
): Promise<PersistedOnboardingDraftResult> {
  const database = getDatabase();

  return database.transaction(async (transaction) => {
    const [businessRow] = await transaction
      .select({ id: business.id })
      .from(business)
      .where(eq(business.id, patch.businessId))
      .for("update")
      .limit(1);

    if (!businessRow) return { status: "missing" } as const;

    await transaction
      .insert(businessOnboardingDraft)
      .values({ businessId: patch.businessId })
      .onConflictDoNothing({ target: businessOnboardingDraft.businessId });

    const [currentRow] = await transaction
      .select()
      .from(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, patch.businessId))
      .limit(1);

    if (!currentRow) return { status: "missing" } as const;

    const current = toDomainDraft(currentRow);
    const validated = saveBusinessOnboardingDraft(current, patch);
    if (validated.status !== "saved") return validated;

    const [updated] = await transaction
      .update(businessOnboardingDraft)
      .set({
        version: validated.draft.version,
        profile: validated.draft.profile,
        location: validated.draft.location,
        services: validated.draft.services,
        hours: validated.draft.hours,
        updatedAt: validated.draft.updatedAt,
      })
      .where(
        and(
          eq(businessOnboardingDraft.businessId, patch.businessId),
          eq(businessOnboardingDraft.version, patch.expectedVersion),
        ),
      )
      .returning();

    if (updated) {
      return { status: "saved", draft: toDomainDraft(updated) } as const;
    }

    const [latest] = await transaction
      .select({ version: businessOnboardingDraft.version })
      .from(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, patch.businessId))
      .limit(1);

    return latest
      ? ({ status: "conflict", currentVersion: latest.version } as const)
      : ({ status: "missing" } as const);
  });
}
