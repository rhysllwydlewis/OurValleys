import { asc, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessAppearance,
  businessMedia,
  category,
} from "@/lib/database/schema/business";
import {
  getBusinessAppearance,
  saveBusinessAppearance,
} from "@/modules/businesses/appearance-repository";
import {
  moveBusinessGalleryMedia,
  removeBusinessMedia,
  updateBusinessMediaPresentation,
} from "@/modules/businesses/media";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  userId: "00000000-0000-4000-8000-000000000921",
  categoryId: "00000000-0000-4000-8000-000000000922",
  businessId: "00000000-0000-4000-8000-000000000923",
  galleryA: "00000000-0000-4000-8000-000000000924",
  galleryB: "00000000-0000-4000-8000-000000000925",
  galleryC: "00000000-0000-4000-8000-000000000926",
} as const;

describeDatabase("business appearance and media", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.userId,
      name: "Appearance Fixture",
      email: "appearance.fixture@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture creative services",
      slug: "fixture-creative-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Fixture Website Studio",
      slug: "fixture-website-studio",
      summary: "A fictional business used to test generated website settings.",
      description: "This business exists only during automated tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      createdByUserId: fixture.userId,
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.userId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("persists and reloads the approved template, palette, order and layouts", async () => {
    const saved = await saveBusinessAppearance(fixture.businessId, {
      templateKey: "warm",
      accentKey: "heather",
      hiddenSections: ["hours"],
      sectionOrder: ["gallery", "about", "services", "location", "hours"],
      sectionLayouts: {
        about: "stacked",
        services: "list",
        gallery: "feature",
        location: "statement",
        hours: "compact",
      },
    });

    expect(saved.status).toBe("saved");
    await expect(getBusinessAppearance(fixture.businessId)).resolves.toEqual({
      templateKey: "warm",
      accentKey: "heather",
      hiddenSections: ["hours"],
      sectionOrder: ["gallery", "about", "services", "location", "hours"],
      sectionLayouts: {
        about: "stacked",
        services: "list",
        gallery: "feature",
        location: "statement",
        hours: "compact",
      },
    });

    const database = getDatabase();
    const [row] = await database
      .select()
      .from(businessAppearance)
      .where(eq(businessAppearance.businessId, fixture.businessId));
    expect(row?.sectionLayouts).toEqual([
      "about:stacked",
      "services:list",
      "gallery:feature",
      "location:statement",
      "hours:compact",
    ]);
  });

  it("updates focal data, moves gallery records atomically and removes safely", async () => {
    const database = getDatabase();
    await database.insert(businessMedia).values([
      {
        id: fixture.galleryA,
        businessId: fixture.businessId,
        role: "gallery",
        storageKey: "tests/gallery-a.png",
        altText: "Gallery A",
        contentType: "image/png",
        byteSize: 100,
        sortOrder: 0,
      },
      {
        id: fixture.galleryB,
        businessId: fixture.businessId,
        role: "gallery",
        storageKey: "tests/gallery-b.png",
        altText: "Gallery B",
        contentType: "image/png",
        byteSize: 100,
        sortOrder: 1,
      },
      {
        id: fixture.galleryC,
        businessId: fixture.businessId,
        role: "gallery",
        storageKey: "tests/gallery-c.png",
        altText: "Gallery C",
        contentType: "image/png",
        byteSize: 100,
        sortOrder: 2,
      },
    ]);

    await expect(
      updateBusinessMediaPresentation({
        businessId: fixture.businessId,
        mediaId: fixture.galleryB,
        altText: "Updated gallery description",
        focalX: 25,
        focalY: 75,
      }),
    ).resolves.toEqual({ status: "saved" });

    await expect(
      moveBusinessGalleryMedia({
        businessId: fixture.businessId,
        mediaId: fixture.galleryB,
        direction: "up",
      }),
    ).resolves.toEqual({ status: "moved" });

    let rows = await database
      .select({
        id: businessMedia.id,
        altText: businessMedia.altText,
        focalX: businessMedia.focalX,
        focalY: businessMedia.focalY,
        sortOrder: businessMedia.sortOrder,
        status: businessMedia.status,
      })
      .from(businessMedia)
      .where(eq(businessMedia.businessId, fixture.businessId))
      .orderBy(asc(businessMedia.sortOrder));

    expect(rows.map((row) => row.id)).toEqual([
      fixture.galleryB,
      fixture.galleryA,
      fixture.galleryC,
    ]);
    expect(rows[0]).toMatchObject({
      altText: "Updated gallery description",
      focalX: 25,
      focalY: 75,
    });

    await expect(
      removeBusinessMedia({
        businessId: fixture.businessId,
        mediaId: fixture.galleryA,
      }),
    ).resolves.toEqual({ status: "removed" });

    rows = await database
      .select({
        id: businessMedia.id,
        altText: businessMedia.altText,
        focalX: businessMedia.focalX,
        focalY: businessMedia.focalY,
        sortOrder: businessMedia.sortOrder,
        status: businessMedia.status,
      })
      .from(businessMedia)
      .where(eq(businessMedia.businessId, fixture.businessId))
      .orderBy(asc(businessMedia.sortOrder));

    expect(
      rows
        .filter((row) => row.status === "active")
        .map((row) => ({ id: row.id, sortOrder: row.sortOrder })),
    ).toEqual([
      { id: fixture.galleryB, sortOrder: 0 },
      { id: fixture.galleryC, sortOrder: 1 },
    ]);
    expect(rows.find((row) => row.id === fixture.galleryA)?.status).toBe(
      "removed",
    );
  });
});
