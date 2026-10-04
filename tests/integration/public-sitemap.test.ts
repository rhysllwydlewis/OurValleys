import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { guide } from "@/lib/database/schema/guides";
import { listEligiblePublicSitemapEntries } from "@/lib/public-sitemap";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const ids = {
  pilot: "00000000-0000-4000-8000-00000000a201",
  seeding: "00000000-0000-4000-8000-00000000a202",
  planned: "00000000-0000-4000-8000-00000000a203",
  retired: "00000000-0000-4000-8000-00000000a204",
} as const;

function fixturePlace(
  id: string,
  slug: string,
  coverageStatus: string,
  status: string,
) {
  return {
    id,
    canonicalName: `Sitemap ${slug}`,
    slug,
    placeType: "town",
    coverageStatus,
    editorialSummary: "Fictional place used only by automated tests.",
    status,
  };
}

describeDatabase("public sitemap place entries", () => {
  const originalStage = process.env.OURVALLEYS_RELEASE_STAGE;

  beforeEach(async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "public";
    await getDatabase()
      .insert(place)
      .values([
        fixturePlace(ids.pilot, "sitemap-pilot", "pilot", "active"),
        fixturePlace(ids.seeding, "sitemap-seeding", "seeding", "active"),
        fixturePlace(ids.planned, "sitemap-planned", "planned", "active"),
        fixturePlace(ids.retired, "sitemap-retired", "pilot", "retired"),
      ]);
  });

  afterEach(async () => {
    if (originalStage === undefined) {
      delete process.env.OURVALLEYS_RELEASE_STAGE;
    } else {
      process.env.OURVALLEYS_RELEASE_STAGE = originalStage;
    }
    await getDatabase()
      .delete(place)
      .where(inArray(place.id, Object.values(ids)));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("lists active places with coverage and omits planned or retired ones", async () => {
    const paths = (await listEligiblePublicSitemapEntries()).map(
      (entry) => entry.path,
    );

    expect(paths).toContain("/places/sitemap-pilot");
    expect(paths).toContain("/places/sitemap-seeding");
    expect(paths).not.toContain("/places/sitemap-planned");
    expect(paths).not.toContain("/places/sitemap-retired");
    expect(paths).not.toContain("/places");
  });

  it("lists published guides and the guides index, omitting drafts and archived", async () => {
    const db = getDatabase();
    const base = {
      summary: "Fictional guide used only by automated tests.",
      areaLabel: "Test valley",
      readingTime: "2 min",
      authorName: "Test author",
    };
    await db.insert(guide).values([
      {
        ...base,
        slug: "sitemap-guide-live",
        title: "Live",
        status: "published",
      },
      { ...base, slug: "sitemap-guide-draft", title: "Draft", status: "draft" },
      { ...base, slug: "sitemap-guide-old", title: "Old", status: "archived" },
    ]);
    try {
      const paths = (await listEligiblePublicSitemapEntries()).map(
        (entry) => entry.path,
      );
      expect(paths).toContain("/guides");
      expect(paths).toContain("/guides/sitemap-guide-live");
      expect(paths).not.toContain("/guides/sitemap-guide-draft");
      expect(paths).not.toContain("/guides/sitemap-guide-old");
    } finally {
      await db
        .delete(guide)
        .where(
          inArray(guide.slug, [
            "sitemap-guide-live",
            "sitemap-guide-draft",
            "sitemap-guide-old",
          ]),
        );
    }
  });

  it("advertises nothing before public release", async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "private_pilot";

    await expect(listEligiblePublicSitemapEntries()).resolves.toEqual([]);
  });
});
