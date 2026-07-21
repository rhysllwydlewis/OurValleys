import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessEntitlement } from "@/lib/database/schema/business-operations";

export const businessCapabilities = [
  "website",
  "directory",
  "contacts",
  "enquiries",
  "offers",
  "events",
  "menu",
  "category_sections",
  "qr",
  "basic_analytics",
] as const;

export type BusinessCapability = (typeof businessCapabilities)[number];

export const freeBusinessLimits = {
  galleryImages: 12,
  logoImages: 1,
  heroImages: 1,
  teamMembers: 4,
  locations: 1,
  activeOffers: 10,
  activeEvents: 25,
} as const;

export type BusinessEntitlementView = {
  planKey: "free" | "custom";
  capabilities: BusinessCapability[];
  limits: Record<string, number>;
};

export const defaultFreeEntitlement: BusinessEntitlementView = {
  planKey: "free",
  capabilities: [...businessCapabilities],
  limits: { ...freeBusinessLimits },
};

function normaliseCapabilities(values: readonly string[]): BusinessCapability[] {
  const allowed = new Set<string>(businessCapabilities);
  return values.filter((value): value is BusinessCapability => allowed.has(value));
}

function normaliseLimits(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...freeBusinessLimits };
  }

  const limits = { ...freeBusinessLimits } as Record<string, number>;
  for (const [key, candidate] of Object.entries(value)) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0) {
      limits[key] = Math.floor(candidate);
    }
  }
  return limits;
}

export async function ensureBusinessEntitlement(
  businessId: string,
): Promise<BusinessEntitlementView> {
  try {
    const database = getDatabase();
    await database
      .insert(businessEntitlement)
      .values({
        businessId,
        planKey: "free",
        capabilities: [...businessCapabilities],
        limits: { ...freeBusinessLimits },
      })
      .onConflictDoNothing({ target: businessEntitlement.businessId });

    return getBusinessEntitlement(businessId);
  } catch {
    return defaultFreeEntitlement;
  }
}

export async function getBusinessEntitlement(
  businessId: string,
): Promise<BusinessEntitlementView> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        planKey: businessEntitlement.planKey,
        capabilities: businessEntitlement.capabilities,
        limits: businessEntitlement.limits,
      })
      .from(businessEntitlement)
      .where(eq(businessEntitlement.businessId, businessId))
      .limit(1);

    if (!row) return defaultFreeEntitlement;
    return {
      planKey: row.planKey === "custom" ? "custom" : "free",
      capabilities: normaliseCapabilities(row.capabilities),
      limits: normaliseLimits(row.limits),
    };
  } catch {
    return defaultFreeEntitlement;
  }
}

export async function hasBusinessCapability(
  businessId: string,
  capability: BusinessCapability,
): Promise<boolean> {
  const entitlement = await getBusinessEntitlement(businessId);
  return entitlement.capabilities.includes(capability);
}

export async function resetBusinessToFreeEntitlement(
  businessId: string,
): Promise<void> {
  const database = getDatabase();
  await database
    .insert(businessEntitlement)
    .values({
      businessId,
      planKey: "free",
      capabilities: [...businessCapabilities],
      limits: { ...freeBusinessLimits },
    })
    .onConflictDoUpdate({
      target: businessEntitlement.businessId,
      set: {
        planKey: "free",
        capabilities: [...businessCapabilities],
        limits: { ...freeBusinessLimits },
        updatedAt: sql`now()`,
      },
    });
}
