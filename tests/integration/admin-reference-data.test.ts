import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { category, place } from "@/lib/database/schema/business";
import {
  createCategoryForAdmin,
  updateCategoryForAdmin,
} from "@/modules/reference-data/admin-categories";
import {
  createPlaceForAdmin,
  updatePlaceForAdmin,
} from "@/modules/reference-data/admin-places";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const categorySlug = "fixture-admin-category-slug";
const placeSlug = "fixture-admin-place-slug";

describeDatabase("admin reference data", () => {
  afterEach(async () => {
    const database = getDatabase();
    await database.delete(category).where(eq(category.slug, categorySlug));
    await database.delete(place).where(eq(place.slug, placeSlug));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("categories", () => {
    it("creates a category and rejects invalid input", async () => {
      const invalid = await createCategoryForAdmin({ name: "x" });
      expect(invalid).toEqual({ status: "invalid" });

      const created = await createCategoryForAdmin({
        name: "Fixture Admin Category",
        slug: categorySlug,
        description: "A fictional category created only by automated tests.",
        sortOrder: 5,
      });
      expect(created.status).toBe("created");
    });

    it("rejects a duplicate slug", async () => {
      await createCategoryForAdmin({
        name: "Fixture Admin Category",
        slug: categorySlug,
        description: "A fictional category created only by automated tests.",
      });
      const duplicate = await createCategoryForAdmin({
        name: "Another Name",
        slug: categorySlug,
        description: "A fictional category created only by automated tests.",
      });
      expect(duplicate).toEqual({ status: "duplicate_slug" });
    });

    it("updates a category's status and sort order", async () => {
      const created = await createCategoryForAdmin({
        name: "Fixture Admin Category",
        slug: categorySlug,
        description: "A fictional category created only by automated tests.",
      });
      expect(created.status).toBe("created");
      if (created.status !== "created") throw new Error("Expected created");

      const updated = await updateCategoryForAdmin({
        id: created.id,
        name: "Fixture Admin Category Renamed",
        slug: categorySlug,
        description: "An updated fictional description.",
        status: "inactive",
        sortOrder: 9,
      });
      expect(updated).toEqual({ status: "updated" });

      const database = getDatabase();
      const [row] = await database
        .select({ status: category.status, sortOrder: category.sortOrder })
        .from(category)
        .where(eq(category.id, created.id));
      expect(row?.status).toBe("inactive");
      expect(row?.sortOrder).toBe(9);
    });
  });

  describe("places", () => {
    it("creates a place with a valid slug and rejects invalid input", async () => {
      const invalid = await createPlaceForAdmin({ canonicalName: "x" });
      expect(invalid).toEqual({ status: "invalid" });

      const created = await createPlaceForAdmin({
        canonicalName: "Fixture Admin Place",
        slug: placeSlug,
        placeType: "town",
        editorialSummary: "A fictional place created only by automated tests.",
      });
      expect(created.status).toBe("created");
    });

    it("rejects a duplicate slug", async () => {
      await createPlaceForAdmin({
        canonicalName: "Fixture Admin Place",
        slug: placeSlug,
        placeType: "town",
        editorialSummary: "A fictional place created only by automated tests.",
      });
      const duplicate = await createPlaceForAdmin({
        canonicalName: "Another Place",
        slug: placeSlug,
        placeType: "town",
        editorialSummary: "A fictional place created only by automated tests.",
      });
      expect(duplicate).toEqual({ status: "duplicate_slug" });
    });

    it("updates a place's coverage status", async () => {
      const created = await createPlaceForAdmin({
        canonicalName: "Fixture Admin Place",
        slug: placeSlug,
        placeType: "town",
        editorialSummary: "A fictional place created only by automated tests.",
      });
      expect(created.status).toBe("created");
      if (created.status !== "created") throw new Error("Expected created");

      const updated = await updatePlaceForAdmin({
        id: created.id,
        canonicalName: "Fixture Admin Place",
        slug: placeSlug,
        placeType: "town",
        coverageStatus: "active",
        editorialSummary: "An updated fictional summary.",
        status: "active",
      });
      expect(updated).toEqual({ status: "updated" });

      const database = getDatabase();
      const [row] = await database
        .select({ coverageStatus: place.coverageStatus })
        .from(place)
        .where(eq(place.id, created.id));
      expect(row?.coverageStatus).toBe("active");
    });
  });
});
