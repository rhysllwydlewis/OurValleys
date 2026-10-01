import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessAttributes } from "@/lib/database/schema/business-attributes";
import {
  businessAttributesInputSchema,
  type BusinessAttributeValues,
} from "./attribute-definitions";
import { businessPermissions, canUserAccessBusiness } from "./permissions";

export {
  businessAttributeDefinitions,
  businessAttributesInputSchema,
  listDeclaredAttributes,
  type BusinessAttributeKey,
  type BusinessAttributeValues,
} from "./attribute-definitions";

function toColumnValues(values: BusinessAttributeValues) {
  return {
    stepFreeAccess: values.stepFreeAccess,
    accessibleToilet: values.accessibleToilet,
    hearingLoop: values.hearingLoop,
    welshSpeaking: values.welshSpeaking,
    deliveryAvailable: values.deliveryAvailable,
    collectionAvailable: values.collectionAvailable,
    emergencyAvailable: values.emergencyAvailable,
    appointmentRequired: values.appointmentRequired,
  };
}

/**
 * Returns the business's declared attributes, or null if the owner has
 * never saved this step yet (distinct from "saved, all false").
 */
export async function getBusinessAttributes(
  businessId: string,
): Promise<BusinessAttributeValues | null> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select()
      .from(businessAttributes)
      .where(eq(businessAttributes.businessId, businessId))
      .limit(1);
    if (!row) return null;
    return toColumnValues(row);
  } catch {
    return null;
  }
}

export type SaveBusinessAttributesResult =
  | { status: "saved"; attributes: BusinessAttributeValues }
  | { status: "invalid" }
  | { status: "unavailable" };

export async function saveBusinessAttributes(input: {
  businessId: string;
  attributes: unknown;
}): Promise<SaveBusinessAttributesResult> {
  const parsed = businessAttributesInputSchema.safeParse(input.attributes);
  if (!parsed.success) return { status: "invalid" };

  try {
    const database = getDatabase();
    const values = toColumnValues(parsed.data);
    await database
      .insert(businessAttributes)
      .values({ businessId: input.businessId, ...values })
      .onConflictDoUpdate({
        target: businessAttributes.businessId,
        set: { ...values, updatedAt: sql`now()` },
      });
    return { status: "saved", attributes: parsed.data };
  } catch {
    return { status: "unavailable" };
  }
}

export type BusinessAttributesWriteResult =
  SaveBusinessAttributesResult | { status: "forbidden" };

/**
 * Saves declared attributes after a server-side edit-permission check.
 * Fails closed on missing permission, matching the onboarding draft's
 * access-control pattern.
 */
export async function saveBusinessAttributesForUser(input: {
  userId: string;
  businessId: string;
  attributes: unknown;
}): Promise<BusinessAttributesWriteResult> {
  const authorised = await canUserAccessBusiness({
    userId: input.userId,
    businessId: input.businessId,
    permission: businessPermissions.editProfile,
  });
  if (!authorised) return { status: "forbidden" };

  return saveBusinessAttributes({
    businessId: input.businessId,
    attributes: input.attributes,
  });
}
