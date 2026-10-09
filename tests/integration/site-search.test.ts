import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import { searchSite } from "@/modules/search/site-search";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const slugs = [
  "fixture-site-search-published",
  "fixture-site-search-draft",
  "fixture-site-search-archived",
] as const;

function guideRow(slug: string, status: string, title: string) {
  return {
    slug,
    title,
    summary: "Fictional guide used only by automated site search tests.",
    areaLabel: "Fixture valley",
    readingTime: "3 minute read",
    authorName: "Fixture author",
    status,
    publishedAt: status === "published" ? new Date() : null,
  };
}

describeDatabase("site search", () => {
  beforeEach(async () => {
    await getDatabase()
      .insert(guide)
      .values([
        guideRow(slugs[0], "published", "Zzfixture lantern walk"),
        guideRow(slugs[1], "draft", "Zzfixture lantern draft"),
        guideRow(slugs[2], "archived", "Zzfixture lantern archive"),
      ]);
  });

  afterEach(async () => {
    await getDatabase()
      .delete(guide)
      .where(inArray(guide.slug, [...slugs]));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("returns only published guides", async () => {
    const result = await searchSite("zzfixture lantern");
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.guides.map((item) => item.slug)).toEqual([slugs[0]]);
  });

  it("treats LIKE wildcards in the query literally", async () => {
    const result = await searchSite("zzfixture%");
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.guides).toEqual([]);
  });

  it("stays idle for empty or one-character queries", async () => {
    expect(await searchSite("")).toEqual({ state: "idle" });
    expect(await searchSite(" z ")).toEqual({ state: "idle" });
  });

  it("matches nothing for an unknown phrase without failing", async () => {
    const result = await searchSite("qqqqnotathing");
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.total).toBe(0);
  });
});
