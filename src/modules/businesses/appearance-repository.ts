import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessAppearance } from "@/lib/database/schema/business";
import {
  appearanceSchema,
  defaultAppearance,
  normalizeAppearance,
  type BusinessAppearanceConfig,
} from "./appearance";

export async function getBusinessAppearance(
  businessId: string,
): Promise<BusinessAppearanceConfig> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        templateKey: businessAppearance.templateKey,
        accentKey: businessAppearance.accentKey,
        hiddenSections: businessAppearance.hiddenSections,
        sectionOrder: businessAppearance.sectionOrder,
      })
      .from(businessAppearance)
      .where(eq(businessAppearance.businessId, businessId))
      .limit(1);

    if (!row) return defaultAppearance;
    return normalizeAppearance({
      ...row,
      sectionOrder:
        row.sectionOrder.length > 0
          ? row.sectionOrder
          : defaultAppearance.sectionOrder,
    });
  } catch {
    return defaultAppearance;
  }
}

export type SaveAppearanceResult =
  { status: "saved" } | { status: "invalid" } | { status: "unavailable" };

export async function saveBusinessAppearance(
  businessId: string,
  value: unknown,
): Promise<SaveAppearanceResult> {
  if (!appearanceSchema.safeParse(value).success) {
    return { status: "invalid" };
  }
  const appearance = normalizeAppearance(value);

  try {
    const database = getDatabase();
    await database
      .insert(businessAppearance)
      .values({ businessId, ...appearance })
      .onConflictDoUpdate({
        target: businessAppearance.businessId,
        set: { ...appearance, updatedAt: sql`now()` },
      });
    return { status: "saved" };
  } catch {
    return { status: "unavailable" };
  }
}
