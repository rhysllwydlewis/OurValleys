import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMedia,
  category,
} from "@/lib/database/schema/business";
import { promoteGalleryMediaToCover } from "@/modules/businesses/media";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000c01",
  categoryId: "00000000-0000-4000-8000-000000000c02",
  businessId: "00000000-0000-4000-8000-000000000c03",
  otherBusinessId: "00000000-0000-4000-8000-000000000c04",
  hero: "00000000-0000-4000-8000-000000000c11",
  galleryA: "00000000-0000-4000-8000-000000000c12",
  galleryB: "00000000-0000-4000-8000-000000000c13",
  logo: "00000000-0000-4000-8000-000000000c14",
  foreignGallery: "00000000-0000-4000-8000-000000000c15",
  removedGallery: "00000000-0000-4000-8000-000000000c16",
} as const;

function row(
  id: string,
  businessId: string,
  role: string,
  sortOrder: number,
  status = "active",
) {
  return {
    id,
    businessId,
    role,
    status,
    storageKey: `fixture/${id}.webp`,
    altText: `Fixture ${id.slice(-2)}`,
    contentType: "image/webp",
    byteSize: 1000,
    sortOrder,
  };
}

describeDatabase("promoting a gallery photo to the cover", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.userId,
      name: "Promotion Fixture",
      email: "photo.promotion.fixture@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture promotion category",
      slug: "fixture-promotion-category",
      description: "Fictional category used only by automated tests.",
    });
    for (const [id, slug] of [
      [fixture.businessId, "fixture-promotion"],
      [fixture.otherBusinessId, "fixture-promotion-other"],
    ] as const) {
      await database.insert(business).values({
        id,
        tradingName: `Fixture ${slug}`,
        slug,
        summary: "A fictional business used only by automated tests.",
        description: "This business exists only during automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        createdByUserId: fixture.userId,
      });
    }
    await database
      .insert(businessMedia)
      .values([
        row(fixture.hero, fixture.businessId, "hero", 0),
        row(fixture.galleryA, fixture.businessId, "gallery", 0),
        row(fixture.galleryB, fixture.businessId, "gallery", 1),
        row(fixture.logo, fixture.businessId, "logo", 0),
        row(fixture.foreignGallery, fixture.otherBusinessId, "gallery", 0),
        row(
          fixture.removedGallery,
          fixture.businessId,
          "gallery",
          2,
          "removed",
        ),
      ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.userId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function active(businessId: string) {
    const rows = await getDatabase()
      .select({
        id: businessMedia.id,
        role: businessMedia.role,
        sortOrder: businessMedia.sortOrder,
      })
      .from(businessMedia)
      .where(eq(businessMedia.businessId, businessId));
    return rows;
  }

  it("swaps the cover with the chosen photo and keeps both", async () => {
    await expect(
      promoteGalleryMediaToCover({
        businessId: fixture.businessId,
        mediaId: fixture.galleryB,
      }),
    ).resolves.toEqual({ status: "promoted" });

    const rows = await active(fixture.businessId);
    expect(rows.find((entry) => entry.id === fixture.galleryB)).toMatchObject({
      role: "hero",
      sortOrder: 0,
    });
    // The old cover joins the end of the gallery rather than being retired.
    const oldCover = rows.find((entry) => entry.id === fixture.hero);
    expect(oldCover?.role).toBe("gallery");
    expect(oldCover!.sortOrder).toBeGreaterThan(
      rows.find((entry) => entry.id === fixture.galleryA)!.sortOrder,
    );
    // The logo is untouched and there is still exactly one active cover.
    expect(rows.find((entry) => entry.id === fixture.logo)?.role).toBe("logo");
    expect(rows.filter((entry) => entry.role === "hero")).toHaveLength(1);
  });

  it("works when there is no cover yet", async () => {
    await getDatabase()
      .delete(businessMedia)
      .where(eq(businessMedia.id, fixture.hero));
    await expect(
      promoteGalleryMediaToCover({
        businessId: fixture.businessId,
        mediaId: fixture.galleryA,
      }),
    ).resolves.toEqual({ status: "promoted" });
    const rows = await active(fixture.businessId);
    expect(rows.find((entry) => entry.id === fixture.galleryA)?.role).toBe(
      "hero",
    );
  });

  it("reports the current cover as unchanged", async () => {
    await expect(
      promoteGalleryMediaToCover({
        businessId: fixture.businessId,
        mediaId: fixture.hero,
      }),
    ).resolves.toEqual({ status: "unchanged" });
  });

  it("refuses another business's photo, a logo, a removed photo and unknown ids", async () => {
    const before = await active(fixture.businessId);
    for (const mediaId of [
      fixture.foreignGallery,
      fixture.logo,
      fixture.removedGallery,
      "00000000-0000-4000-8000-000000000cff",
    ]) {
      await expect(
        promoteGalleryMediaToCover({ businessId: fixture.businessId, mediaId }),
      ).resolves.toEqual({ status: "missing" });
    }
    const after = await active(fixture.businessId);
    expect(after).toEqual(expect.arrayContaining(before));
    // The other business keeps its photo as a gallery photo.
    expect(
      (await active(fixture.otherBusinessId)).find(
        (entry) => entry.id === fixture.foreignGallery,
      )?.role,
    ).toBe("gallery");
  });

  it("never leaves two covers when promotions race", async () => {
    await Promise.all([
      promoteGalleryMediaToCover({
        businessId: fixture.businessId,
        mediaId: fixture.galleryA,
      }),
      promoteGalleryMediaToCover({
        businessId: fixture.businessId,
        mediaId: fixture.galleryB,
      }),
    ]);
    const heroes = (await active(fixture.businessId)).filter(
      (entry) => entry.role === "hero",
    );
    expect(heroes).toHaveLength(1);
  });
});
