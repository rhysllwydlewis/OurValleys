import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { guide } from "@/lib/database/schema/guides";
import { business } from "@/lib/database/schema/business";
import { businessOffer } from "@/lib/database/schema/business-operations";
import { loadSearchStart, searchSite } from "@/modules/search/site-search";

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

const fixtureBusinessId = "00000000-0000-4000-8000-000000000401";
const draftOfferId = "00000000-0000-4000-8000-00000000f901";
const hiddenOfferId = "00000000-0000-4000-8000-00000000f902";

describeDatabase("site search overhaul", () => {
  beforeEach(async () => {
    const base = {
      businessId: fixtureBusinessId,
      description: "Integration test offer for site search.",
    };
    await getDatabase()
      .insert(businessOffer)
      .values([
        {
          ...base,
          id: draftOfferId,
          title: "Zzdraft boiler deal",
          status: "draft",
        },
        {
          ...base,
          id: hiddenOfferId,
          title: "Zzhidden boiler deal",
          status: "hidden",
        },
      ])
      .onConflictDoNothing();
  });

  afterEach(async () => {
    await getDatabase()
      .delete(businessOffer)
      .where(inArray(businessOffer.id, [draftOfferId, hiddenOfferId]));
  });

  function ready(result: Awaited<ReturnType<typeof searchSite>>) {
    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("expected ready");
    return result;
  }

  it("finds live offers but never draft or hidden ones", async () => {
    const found = ready(await searchSite("heating check"));
    expect(found.offers.total).toBeGreaterThanOrEqual(1);
    expect(found.counts.offers).toBe(found.offers.total);
    const hidden = ready(await searchSite("zzdraft boiler"));
    expect(hidden.offers.total).toBe(0);
    expect(ready(await searchSite("zzhidden boiler")).offers.total).toBe(0);
  });

  it("does not treat punctuation alone as a search", async () => {
    expect(await searchSite("%%")).toEqual({ state: "idle" });
    expect(await searchSite("__")).toEqual({ state: "idle" });
  });

  it("matches wildcard characters literally inside offers and events", async () => {
    const result = ready(await searchSite("zz%heating"));
    expect(result.offers.total).toBe(0);
    expect(result.events.total).toBe(0);
  });

  it("offers an exact business name as the best match", async () => {
    const result = ready(await searchSite("Cwm & Coil Heating"));
    expect(result.top).toMatchObject({
      kind: "business",
      slug: "cwm-coil-heating",
      exact: true,
    });
    expect(result.recovery).toBeNull();
  });

  it("matches a place by name with the number of businesses inside it", async () => {
    const result = ready(await searchSite("tonypandy"));
    const place = result.places.find((item) => item.slug === "tonypandy");
    expect(place?.businesses).toBeGreaterThanOrEqual(1);
    expect(result.top).toMatchObject({ kind: "place", slug: "tonypandy" });
    expect(result.counts.places).toBe(result.places.length);
  });

  it("matches categories and reports how many businesses they hold", async () => {
    const result = ready(await searchSite("plumbing"));
    const category = result.categories.find(
      (item) => item.slug === "plumbing-heating",
    );
    expect(category?.businesses).toBeGreaterThanOrEqual(1);
  });

  it("keeps the open tab paged and the others as short previews", async () => {
    const all = ready(await searchSite("heating"));
    expect(all.type).toBe("all");
    expect(all.totalPages).toBe(0);
    const tab = ready(
      await searchSite("heating", { type: "businesses", page: 1 }),
    );
    expect(tab.type).toBe("businesses");
    expect(tab.businesses.total).toBe(all.businesses.total);
    expect(tab.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("does not leak the businesses of an unpublished record", async () => {
    const database = getDatabase();
    const [original] = await database
      .select({ status: business.status })
      .from(business)
      .where(eq(business.id, fixtureBusinessId));
    try {
      await database
        .update(business)
        .set({ status: "suspended" })
        .where(eq(business.id, fixtureBusinessId));
      const result = ready(await searchSite("cwm coil heating"));
      expect(result.businesses.items).toEqual([]);
      expect(result.offers.items).toEqual([]);
      expect(result.events.items).toEqual([]);
      expect(result.top).toBeNull();
    } finally {
      await database
        .update(business)
        .set({ status: original?.status ?? "published" })
        .where(eq(business.id, fixtureBusinessId));
    }
  });

  it("recovers from nothing found with categories to browse", async () => {
    const result = ready(await searchSite("qqqqnotathing"));
    expect(result.total).toBe(0);
    expect(result.recovery).not.toBeNull();
    expect(result.recovery?.categories.length).toBeGreaterThan(0);
  });

  it("offers categories and towns that really have businesses before anything is typed", async () => {
    const start = await loadSearchStart();
    expect(start.categories.map((item) => item.slug)).toContain(
      "plumbing-heating",
    );
    expect(start.categories.every((item) => item.count > 0)).toBe(true);
    expect(start.places.map((item) => item.slug)).toContain("tonypandy");
  });
});
