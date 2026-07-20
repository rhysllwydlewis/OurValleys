import { and, count, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import { businessCategory } from "@/lib/database/schema/reference";

export const maximumSecondaryCategories = 3;

export type AssignSecondaryCategoryResult =
  | { state: "assigned" }
  | {
      state: "rejected";
      reason:
        | "business_missing"
        | "category_missing"
        | "primary_category"
        | "already_assigned"
        | "limit_reached";
    };

export async function assignSecondaryCategory(input: {
  businessId: string;
  categoryId: string;
}): Promise<AssignSecondaryCategoryResult> {
  const database = getDatabase();

  const [canonicalBusiness] = await database
    .select({ primaryCategoryId: business.primaryCategoryId })
    .from(business)
    .where(eq(business.id, input.businessId))
    .limit(1);

  if (!canonicalBusiness) {
    return { state: "rejected", reason: "business_missing" };
  }
  if (canonicalBusiness.primaryCategoryId === input.categoryId) {
    return { state: "rejected", reason: "primary_category" };
  }

  const [selectedCategory] = await database
    .select({ id: category.id })
    .from(category)
    .where(
      and(eq(category.id, input.categoryId), eq(category.status, "active")),
    )
    .limit(1);

  if (!selectedCategory) {
    return { state: "rejected", reason: "category_missing" };
  }

  const [existing] = await database
    .select({ id: businessCategory.id })
    .from(businessCategory)
    .where(
      and(
        eq(businessCategory.businessId, input.businessId),
        eq(businessCategory.categoryId, input.categoryId),
      ),
    )
    .limit(1);

  if (existing) {
    return { state: "rejected", reason: "already_assigned" };
  }

  const [total] = await database
    .select({ value: count() })
    .from(businessCategory)
    .where(eq(businessCategory.businessId, input.businessId));

  if (Number(total?.value ?? 0) >= maximumSecondaryCategories) {
    return { state: "rejected", reason: "limit_reached" };
  }

  await database.insert(businessCategory).values({
    businessId: input.businessId,
    categoryId: input.categoryId,
    relationshipType: "secondary",
    sortOrder: Number(total?.value ?? 0) + 1,
  });

  return { state: "assigned" };
}
