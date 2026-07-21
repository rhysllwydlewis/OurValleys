import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessAppearance,
  category,
} from "@/lib/database/schema/business";
import {
  appearanceSchema,
  defaultAppearance,
  normalizeAppearance,
  serializeSectionLayouts,
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
        sectionLayouts: businessAppearance.sectionLayouts,
      })
      .from(businessAppearance)
      .where(eq(businessAppearance.businessId, businessId))
      .limit(1);

    if (!row) return normalizeAppearance(defaultAppearance);
    return normalizeAppearance({
      ...row,
      sectionOrder:
        row.sectionOrder.length > 0
          ? row.sectionOrder
          : defaultAppearance.sectionOrder,
      sectionLayouts:
        row.sectionLayouts.length > 0
          ? row.sectionLayouts
          : defaultAppearance.sectionLayouts,
    });
  } catch {
    return normalizeAppearance(defaultAppearance);
  }
}

export type SaveAppearanceResult =
  { status: "saved" } | { status: "invalid" } | { status: "unavailable" };

export async function saveBusinessAppearance(
  businessId: string,
  value: unknown,
): Promise<SaveAppearanceResult> {
  const parsed = appearanceSchema.safeParse(value);
  if (!parsed.success) return { status: "invalid" };

  const appearance = normalizeAppearance(parsed.data);
  const values = {
    businessId,
    templateKey: appearance.templateKey,
    accentKey: appearance.accentKey,
    hiddenSections: appearance.hiddenSections,
    sectionOrder: appearance.sectionOrder,
    sectionLayouts: serializeSectionLayouts(appearance.sectionLayouts),
  };

  try {
    const database = getDatabase();
    await database
      .insert(businessAppearance)
      .values(values)
      .onConflictDoUpdate({
        target: businessAppearance.businessId,
        set: {
          templateKey: values.templateKey,
          accentKey: values.accentKey,
          hiddenSections: values.hiddenSections,
          sectionOrder: values.sectionOrder,
          sectionLayouts: values.sectionLayouts,
          updatedAt: sql`now()`,
        },
      });
    return { status: "saved" };
  } catch {
    return { status: "unavailable" };
  }
}

export type BusinessPresentationContext = {
  tradingName: string;
  category: { name: string; slug: string };
} | null;

/**
 * Private dashboard/preview lookup for the non-sensitive identity and category
 * needed to render the same category variant as the eventual public website.
 * Authorisation remains at the calling route boundary.
 */
export async function getBusinessPresentationContext(
  businessId: string,
): Promise<BusinessPresentationContext> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        tradingName: business.tradingName,
        categoryName: category.name,
        categorySlug: category.slug,
      })
      .from(business)
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .where(eq(business.id, businessId))
      .limit(1);

    return row
      ? {
          tradingName: row.tradingName,
          category: { name: row.categoryName, slug: row.categorySlug },
        }
      : null;
  } catch {
    return null;
  }
}
