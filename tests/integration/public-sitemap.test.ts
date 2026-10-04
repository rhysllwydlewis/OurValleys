import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
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

  it("advertises nothing before public release", async () => {
    process.env.OURVALLEYS_RELEASE_STAGE = "private_pilot";

    await expect(listEligiblePublicSitemapEntries()).resolves.toEqual([]);
  });
});
