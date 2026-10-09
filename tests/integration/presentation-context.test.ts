import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import { getBusinessPresentationContext } from "@/modules/businesses/appearance-repository";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002601",
  businessId: "00000000-0000-4000-8000-000000002602",
} as const;

describeDatabase("business presentation context", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Presentation fixtures",
      slug: "presentation-fixtures",
      welshLabel: "Gosodiadau cyflwyno",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Presentation Fixture",
      slug: "presentation-fixture",
      summary: "A fictional business used only by automated tests.",
      description: "A fictional business used only by automated tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      status: "draft",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("carries the stored Welsh category label alongside the canonical name", async () => {
    await expect(
      getBusinessPresentationContext(fixture.businessId),
    ).resolves.toEqual({
      tradingName: "Presentation Fixture",
      category: {
        name: "Presentation fixtures",
        slug: "presentation-fixtures",
        welshLabel: "Gosodiadau cyflwyno",
      },
    });
  });

  it("reports no Welsh label when none is stored", async () => {
    await getDatabase()
      .update(category)
      .set({ welshLabel: null })
      .where(eq(category.id, fixture.categoryId));
    const context = await getBusinessPresentationContext(fixture.businessId);
    expect(context?.category.welshLabel).toBeNull();
  });
});
