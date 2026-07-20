import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { category } from "@/lib/database/schema/business";
import {
  businessCategory,
  categoryAlias,
  placeAlias,
} from "@/lib/database/schema/reference";
import {
  assignSecondaryCategory,
  maximumSecondaryCategories,
} from "@/modules/reference-data/business-categories";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  businessId: "00000000-0000-4000-8000-000000000401",
  primaryCategoryId: "00000000-0000-4000-8000-000000000201",
  placeId: "00000000-0000-4000-8000-000000000301",
  secondaryCategoryIds: [
    "00000000-0000-4000-8000-000000000211",
    "00000000-0000-4000-8000-000000000212",
    "00000000-0000-4000-8000-000000000213",
    "00000000-0000-4000-8000-000000000214",
  ],
} as const;

describeDatabase("provisional reference data", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values(
      fixture.secondaryCategoryIds.map((id, index) => ({
        id,
        name: `Fixture category ${index + 1}`,
        slug: `fixture-category-${index + 1}`,
        description: "Fictional category used only by automated tests.",
        sortOrder: 100 + index,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessCategory)
      .where(eq(businessCategory.businessId, fixture.businessId));
    await database
      .delete(categoryAlias)
      .where(inArray(categoryAlias.categoryId, fixture.secondaryCategoryIds));
    await database.delete(placeAlias).where(eq(placeAlias.placeId, fixture.placeId));
    await database
      .delete(category)
      .where(inArray(category.id, fixture.secondaryCategoryIds));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("stores English and Welsh aliases without changing canonical records", async () => {
    const database = getDatabase();
    await database.insert(placeAlias).values([
      {
        placeId: fixture.placeId,
        alias: "Tonypandy town centre",
        language: "en",
      },
      {
        placeId: fixture.placeId,
        alias: "Canol tref Tonypandy",
        language: "cy",
      },
    ]);
    await database.insert(categoryAlias).values({
      categoryId: fixture.secondaryCategoryIds[0],
      label: "Gwresogi",
      language: "cy",
    });

    const placeAliases = await database
      .select({ alias: placeAlias.alias, language: placeAlias.language })
      .from(placeAlias)
      .where(eq(placeAlias.placeId, fixture.placeId));
    const categoryAliases = await database
      .select({ label: categoryAlias.label, language: categoryAlias.language })
      .from(categoryAlias)
      .where(eq(categoryAlias.categoryId, fixture.secondaryCategoryIds[0]));

    expect(placeAliases).toEqual(
      expect.arrayContaining([
        { alias: "Tonypandy town centre", language: "en" },
        { alias: "Canol tref Tonypandy", language: "cy" },
      ]),
    );
    expect(categoryAliases).toContainEqual({ label: "Gwresogi", language: "cy" });
  });

  it("rejects the canonical primary category as a secondary category", async () => {
    await expect(
      assignSecondaryCategory({
        businessId: fixture.businessId,
        categoryId: fixture.primaryCategoryId,
      }),
    ).resolves.toEqual({ state: "rejected", reason: "primary_category" });
  });

  it("assigns up to the bounded secondary-category limit", async () => {
    for (const categoryId of fixture.secondaryCategoryIds.slice(
      0,
      maximumSecondaryCategories,
    )) {
      await expect(
        assignSecondaryCategory({ businessId: fixture.businessId, categoryId }),
      ).resolves.toEqual({ state: "assigned" });
    }

    await expect(
      assignSecondaryCategory({
        businessId: fixture.businessId,
        categoryId: fixture.secondaryCategoryIds[3],
      }),
    ).resolves.toEqual({ state: "rejected", reason: "limit_reached" });
  });

  it("fails closed for missing businesses, categories and duplicate assignments", async () => {
    await expect(
      assignSecondaryCategory({
        businessId: "00000000-0000-4000-8000-000000000999",
        categoryId: fixture.secondaryCategoryIds[0],
      }),
    ).resolves.toEqual({ state: "rejected", reason: "business_missing" });

    await expect(
      assignSecondaryCategory({
        businessId: fixture.businessId,
        categoryId: "00000000-0000-4000-8000-000000000999",
      }),
    ).resolves.toEqual({ state: "rejected", reason: "category_missing" });

    await expect(
      assignSecondaryCategory({
        businessId: fixture.businessId,
        categoryId: fixture.secondaryCategoryIds[0],
      }),
    ).resolves.toEqual({ state: "assigned" });
    await expect(
      assignSecondaryCategory({
        businessId: fixture.businessId,
        categoryId: fixture.secondaryCategoryIds[0],
      }),
    ).resolves.toEqual({ state: "rejected", reason: "already_assigned" });
  });
});
