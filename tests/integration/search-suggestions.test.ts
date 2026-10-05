import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { listSearchSuggestions } from "@/modules/businesses/search-suggestions";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixtureBusinessId = "00000000-0000-4000-8000-000000000401";

describeDatabase("search suggestions", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("returns nothing for empty or one-character input", async () => {
    expect(await listSearchSuggestions("")).toEqual([]);
    expect(await listSearchSuggestions("c")).toEqual([]);
    expect(await listSearchSuggestions(null)).toEqual([]);
  });

  it("suggests a published business by prefix and by typo", async () => {
    const prefix = await listSearchSuggestions("cwm &");
    expect(prefix.some((item) => item.href === "/b/cwm-coil-heating")).toBe(
      true,
    );
    const typo = await listSearchSuggestions("cwm coyl heeting");
    expect(typo.some((item) => item.href === "/b/cwm-coil-heating")).toBe(true);
  });

  it("suggests places and categories with working links", async () => {
    const place = await listSearchSuggestions("tonypandy");
    expect(place.find((item) => item.kind === "place")?.href).toBe(
      "/places/tonypandy",
    );
    const category = await listSearchSuggestions("plumbing");
    expect(category.find((item) => item.kind === "category")?.href).toBe(
      "/businesses?category=plumbing-heating",
    );
  });

  it("treats wildcard and injection-like input as literal text", async () => {
    expect(await listSearchSuggestions("%%")).toEqual([]);
    expect(await listSearchSuggestions("'; drop table business;--")).toEqual(
      [],
    );
  });

  it("never exceeds six suggestions", async () => {
    expect((await listSearchSuggestions("ar")).length).toBeLessThanOrEqual(6);
  });

  it("omits a suspended business", async () => {
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
      const result = await listSearchSuggestions("cwm &");
      expect(result.some((item) => item.href === "/b/cwm-coil-heating")).toBe(
        false,
      );
    } finally {
      await database
        .update(business)
        .set({ status: original?.status ?? "published" })
        .where(eq(business.id, fixtureBusinessId));
    }
  });
});
