import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import {
  listCategorySections,
  moveCategorySection,
  removeCategorySection,
  saveCategorySection,
  setCategorySectionStatus,
} from "@/modules/businesses/content-features";
import { maxExtraSections } from "@/modules/businesses/extra-sections-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000002201",
  categoryId: "00000000-0000-4000-8000-000000002202",
  businessA: "00000000-0000-4000-8000-000000002203",
  businessB: "00000000-0000-4000-8000-000000002204",
} as const;

function section(title: string, extra: Record<string, unknown> = {}) {
  return {
    sectionType: "faq" as const,
    title,
    entries: [{ title: "Question?", description: "Answer." }],
    status: "active" as const,
    ...extra,
  };
}

async function titles(businessId: string, publicOnly = false) {
  return (await listCategorySections(businessId, publicOnly)).map(
    (s) => s.title,
  );
}

describeDatabase("business extra sections", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.ownerId,
      name: "Sections Owner",
      email: "sections.owner@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Section fixtures",
      slug: "section-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [fixture.businessA, fixture.businessB].map((id, index) => ({
        id,
        tradingName: `Fixture Sections ${index === 0 ? "A" : "B"}`,
        slug: `fixture-sections-${index === 0 ? "a" : "b"}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: "published" as const,
        createdByUserId: fixture.ownerId,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessA));
    await database.delete(business).where(eq(business.id, fixture.businessB));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("adds sections last and edits in place without moving them", async () => {
    for (const title of ["First", "Second", "Third"]) {
      await expect(
        saveCategorySection({
          businessId: fixture.businessA,
          section: section(title),
        }),
      ).resolves.toBe("saved");
    }
    expect(await titles(fixture.businessA)).toEqual([
      "First",
      "Second",
      "Third",
    ]);

    const [first] = await listCategorySections(fixture.businessA);
    await expect(
      saveCategorySection({
        businessId: fixture.businessA,
        section: section("First, renamed", {
          id: first!.id,
          sectionType: "team",
          entries: [{ title: "Sam", description: "", meta: "Owner" }],
        }),
      }),
    ).resolves.toBe("saved");
    const after = await listCategorySections(fixture.businessA);
    expect(after.map((s) => s.title)).toEqual([
      "First, renamed",
      "Second",
      "Third",
    ]);
    expect(after[0]).toMatchObject({
      sectionType: "team",
      entries: [{ title: "Sam", meta: "Owner" }],
    });
  });

  it("moves a section one place and not past either end", async () => {
    for (const title of ["Alpha", "Bravo", "Charlie"]) {
      await saveCategorySection({
        businessId: fixture.businessA,
        section: section(title),
      });
    }
    const [a, b, c] = await listCategorySections(fixture.businessA);
    const move = (id: string, direction: "up" | "down") =>
      moveCategorySection({
        businessId: fixture.businessA,
        sectionId: id,
        direction,
      });

    await expect(move(c!.id, "up")).resolves.toBe("moved");
    expect(await titles(fixture.businessA)).toEqual([
      "Alpha",
      "Charlie",
      "Bravo",
    ]);
    await expect(move(a!.id, "up")).resolves.toBe("moved");
    expect(await titles(fixture.businessA)).toEqual([
      "Alpha",
      "Charlie",
      "Bravo",
    ]);
    await expect(move(a!.id, "down")).resolves.toBe("moved");
    expect(await titles(fixture.businessA)).toEqual([
      "Charlie",
      "Alpha",
      "Bravo",
    ]);
    // Orders were rewritten as 0..n.
    const orders = (await listCategorySections(fixture.businessA)).map(
      (s) => s.sortOrder,
    );
    expect(orders).toEqual([0, 1, 2]);
    void b;
  });

  it("hides and shows without losing content, and the public list skips hidden", async () => {
    await saveCategorySection({
      businessId: fixture.businessA,
      section: section("Visible"),
    });
    await saveCategorySection({
      businessId: fixture.businessA,
      section: section("Shy"),
    });
    const [, shy] = await listCategorySections(fixture.businessA);

    await expect(
      setCategorySectionStatus({
        businessId: fixture.businessA,
        sectionId: shy!.id,
        status: "hidden",
      }),
    ).resolves.toBe("updated");
    expect(await titles(fixture.businessA, true)).toEqual(["Visible"]);
    expect(await titles(fixture.businessA)).toEqual(["Visible", "Shy"]);

    await setCategorySectionStatus({
      businessId: fixture.businessA,
      sectionId: shy!.id,
      status: "active",
    });
    expect(await titles(fixture.businessA, true)).toEqual(["Visible", "Shy"]);
  });

  it("never lets one business edit, move, hide or remove another's section", async () => {
    await saveCategorySection({
      businessId: fixture.businessA,
      section: section("Mine"),
    });
    await saveCategorySection({
      businessId: fixture.businessB,
      section: section("Theirs"),
    });
    const [theirs] = await listCategorySections(fixture.businessB);

    await expect(
      saveCategorySection({
        businessId: fixture.businessA,
        section: section("Hijacked", { id: theirs!.id }),
      }),
    ).resolves.toBe("not_found");
    await expect(
      moveCategorySection({
        businessId: fixture.businessA,
        sectionId: theirs!.id,
        direction: "up",
      }),
    ).resolves.toBe("not_found");
    await expect(
      setCategorySectionStatus({
        businessId: fixture.businessA,
        sectionId: theirs!.id,
        status: "hidden",
      }),
    ).resolves.toBe("not_found");
    await expect(
      removeCategorySection(fixture.businessA, theirs!.id),
    ).resolves.toBe("not_found");
    expect(await titles(fixture.businessB)).toEqual(["Theirs"]);
    expect((await listCategorySections(fixture.businessB))[0]!.status).toBe(
      "active",
    );
  });

  it("enforces the section limit even when submits race", async () => {
    const results = await Promise.all(
      Array.from({ length: maxExtraSections + 4 }, (_, index) =>
        saveCategorySection({
          businessId: fixture.businessA,
          section: section(`Race ${index}`),
        }),
      ),
    );
    expect(results.filter((r) => r === "saved")).toHaveLength(maxExtraSections);
    expect(results.filter((r) => r === "limit")).toHaveLength(4);
    const orders = (await listCategorySections(fixture.businessA)).map(
      (s) => s.sortOrder,
    );
    expect(new Set(orders).size).toBe(maxExtraSections);
  });

  it("rejects invalid sections and unknown ids, and removes cleanly", async () => {
    await expect(
      saveCategorySection({
        businessId: fixture.businessA,
        section: section("Bad", { sectionType: "blog" }),
      }),
    ).resolves.toBe("invalid");
    await expect(
      saveCategorySection({
        businessId: fixture.businessA,
        section: section("No entries", { entries: [] }),
      }),
    ).resolves.toBe("invalid");
    await expect(
      moveCategorySection({
        businessId: fixture.businessA,
        sectionId: "00000000-0000-4000-8000-0000000099ff",
        direction: "down",
      }),
    ).resolves.toBe("not_found");

    await saveCategorySection({
      businessId: fixture.businessA,
      section: section("Gone"),
    });
    const [gone] = await listCategorySections(fixture.businessA);
    await expect(
      removeCategorySection(fixture.businessA, gone!.id),
    ).resolves.toBe("removed");
    expect(await titles(fixture.businessA)).toEqual([]);
  });
});
