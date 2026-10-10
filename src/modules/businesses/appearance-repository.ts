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
  defaultAppearanceForVariant,
  normalizeAppearance,
  parseStoredSectionCopy,
  resolveCategoryVariant,
  serializeSectionCopy,
  serializeSectionLayouts,
  type BusinessAppearanceConfig,
} from "./appearance";

export type BusinessAppearanceState = {
  appearance: BusinessAppearanceConfig;
  /** False while the owner has not saved a design: the category-led start applies. */
  saved: boolean;
  /** True when the read failed and the appearance shown is only the fallback. */
  unavailable?: boolean;
};

/**
 * The appearance for a business and whether the owner has saved one. Until
 * they do, the starting design for the business's category applies, so a café
 * and an electrician do not open on the same layout.
 */
export async function getBusinessAppearanceState(
  businessId: string,
): Promise<BusinessAppearanceState> {
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

    if (!row) {
      return {
        appearance: await getStartingAppearance(businessId),
        saved: false,
      };
    }
    return {
      appearance: normalizeAppearance({
        ...row,
        sectionOrder:
          row.sectionOrder.length > 0
            ? row.sectionOrder
            : defaultAppearance.sectionOrder,
        sectionLayouts:
          row.sectionLayouts.length > 0
            ? row.sectionLayouts
            : defaultAppearance.sectionLayouts,
        sectionCopy: parseStoredSectionCopy(row.sectionLayouts),
      }),
      saved: true,
    };
  } catch {
    return {
      appearance: normalizeAppearance(defaultAppearance),
      saved: false,
      unavailable: true,
    };
  }
}

export async function getBusinessAppearance(
  businessId: string,
): Promise<BusinessAppearanceConfig> {
  return (await getBusinessAppearanceState(businessId)).appearance;
}

/** The category-led starting design, also what "reset" returns to. */
export async function getStartingAppearance(
  businessId: string,
): Promise<BusinessAppearanceConfig> {
  const context = await getBusinessPresentationContext(businessId);
  return defaultAppearanceForVariant(
    context
      ? resolveCategoryVariant(context.category.name, context.category.slug)
      : "general",
  );
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
    sectionLayouts: [
      ...serializeSectionLayouts(appearance.sectionLayouts),
      ...serializeSectionCopy(appearance.sectionCopy),
    ],
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
  category: { name: string; slug: string; welshLabel: string | null };
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
        categoryWelshLabel: category.welshLabel,
      })
      .from(business)
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .where(eq(business.id, businessId))
      .limit(1);

    return row
      ? {
          tradingName: row.tradingName,
          category: {
            name: row.categoryName,
            slug: row.categorySlug,
            welshLabel: row.categoryWelshLabel,
          },
        }
      : null;
  } catch {
    return null;
  }
}
