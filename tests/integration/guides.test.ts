import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { place } from "@/lib/database/schema/business";
import { guide } from "@/lib/database/schema/guides";
import {
  archiveGuideForAdmin,
  createGuideForAdmin,
  getGuideForAdmin,
  listAllGuidesForAdmin,
  publishGuideForAdmin,
  revertGuideToDraftForAdmin,
  updateGuideForAdmin,
} from "@/modules/guides/admin";
import {
  getPublicGuideBySlug,
  listPublicGuides,
  listPublicGuidesForPlace,
} from "@/modules/guides/public";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  placeId: "00000000-0000-4000-8000-000000000941",
  authorUserId: "00000000-0000-4000-8000-000000000942",
} as const;

const validSection = {
  heading: "Start with a local search",
  body: "Use the business directory to explore published café profiles.",
  href: "/businesses?q=coffee",
  linkLabel: "Search coffee businesses",
};

const furtherSections = [
  {
    heading: "Pick a high street",
    body: "Walk one high street end to end and note which cafés are open.",
    href: "",
    linkLabel: "",
    kind: "text",
  },
  {
    heading: "Ask for the house blend",
    body: "Most independent cafés have a blend they are proud of: ask for it.",
    href: "",
    linkLabel: "",
    kind: "tip",
  },
];

function nextYear(): string {
  return `${new Date().getUTCFullYear() + 1}-06-01`;
}

function guideInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Independent coffee across the Valleys",
    slug: "fixture-independent-coffee",
    summary:
      "How to combine local cafés, high streets and nearby events into an afternoon out.",
    areaLabel: "Across Rhondda Cynon Taf",
    readingTime: "4 minute read",
    authorName: "OurValleys editorial team",
    placeId: fixture.placeId,
    reviewDueAt: nextYear(),
    sections: [validSection, ...furtherSections],
    ...overrides,
  };
}

describeDatabase("guides", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(place).values({
      id: fixture.placeId,
      canonicalName: "Fixture Guide Town",
      slug: "fixture-guide-town",
      placeType: "town",
      editorialSummary: "Fictional place used only by guide tests.",
    });
    await database.insert(user).values({
      id: fixture.authorUserId,
      name: "Fixture Guide Author",
      email: "author@guide-fixture.test",
      emailVerified: true,
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(guide).where(eq(guide.placeId, fixture.placeId));
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database.delete(user).where(eq(user.id, fixture.authorUserId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("creates a guide as a draft that stays out of the public list", async () => {
    const created = await createGuideForAdmin(guideInput());
    expect(created.status).toBe("created");

    const publicList = await listPublicGuides();
    expect(publicList.state).toBe("ready");
    if (publicList.state !== "ready") throw new Error("Expected ready");
    expect(
      publicList.guides.find(
        (item) => item.slug === "fixture-independent-coffee",
      ),
    ).toBeUndefined();
  });

  it("rejects a second guide with the same slug", async () => {
    const first = await createGuideForAdmin(guideInput());
    expect(first.status).toBe("created");

    const second = await createGuideForAdmin(guideInput());
    expect(second.status).toBe("duplicate_slug");
  });

  it("publishes a draft guide so it appears in the public list and by slug", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");

    const published = await publishGuideForAdmin(created.id);
    expect(published).toBe("updated");

    const publicList = await listPublicGuides();
    if (publicList.state !== "ready") throw new Error("Expected ready");
    const listed = publicList.guides.find(
      (item) => item.slug === "fixture-independent-coffee",
    );
    expect(listed?.title).toBe("Independent coffee across the Valleys");
    expect(listed?.sections).toHaveLength(3);
    expect(listed?.sections[0]).toMatchObject({
      ...validSection,
      kind: "text",
    });
    expect(listed?.sections[2]?.kind).toBe("tip");
    expect(new Set(listed?.sections.map((item) => item.id)).size).toBe(3);
    expect(listed?.place).toEqual({
      slug: "fixture-guide-town",
      name: "Fixture Guide Town",
    });
    expect(listed?.publishedAt).toBeInstanceOf(Date);

    const bySlug = await getPublicGuideBySlug("fixture-independent-coffee");
    expect(bySlug?.title).toBe("Independent coffee across the Valleys");
  });

  it("refuses to publish a guide that does not pass the blocking checks, and leaves it a draft", async () => {
    const created = await createGuideForAdmin(
      guideInput({
        slug: "fixture-thin-guide",
        sections: [furtherSections[0]],
      }),
    );
    if (created.status !== "created") throw new Error("Expected created");

    expect(await publishGuideForAdmin(created.id)).toBe("not_ready");
    const stored = await getGuideForAdmin(created.id);
    expect(stored?.status).toBe("draft");
    expect(await getPublicGuideBySlug("fixture-thin-guide")).toBeNull();

    const noReview = await createGuideForAdmin(
      guideInput({ slug: "fixture-no-review", reviewDueAt: undefined }),
    );
    if (noReview.status !== "created") throw new Error("Expected created");
    expect(await publishGuideForAdmin(noReview.id)).toBe("not_ready");
  });

  it("fills a blank reading time from the length of the guide", async () => {
    const created = await createGuideForAdmin(
      guideInput({ slug: "fixture-blank-reading", readingTime: "" }),
    );
    if (created.status !== "created") throw new Error("Expected created");
    expect((await getGuideForAdmin(created.id))?.readingTime).toBe(
      "1 minute read",
    );
  });

  it("names the section and field when a save is refused, and refuses links to other sites", async () => {
    const result = await createGuideForAdmin(
      guideInput({
        sections: [
          validSection,
          { ...furtherSections[0], href: "//evil.example", linkLabel: "Go" },
        ],
      }),
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("Expected invalid");
    expect(result.issues).toEqual([
      "Section 2 link must be a path on this site, such as /businesses.",
    ]);
  });

  it("refuses a stale save when someone else saved in the meantime", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");

    const first = await updateGuideForAdmin(
      guideInput({
        id: created.id,
        title: "First editor's title",
        expectedUpdatedAt: created.updatedAt,
      }),
    );
    expect(first.status).toBe("updated");

    const stale = await updateGuideForAdmin(
      guideInput({
        id: created.id,
        title: "Second editor's title",
        expectedUpdatedAt: created.updatedAt,
      }),
    );
    expect(stale.status).toBe("conflict");
    expect((await getGuideForAdmin(created.id))?.title).toBe(
      "First editor's title",
    );

    if (first.status !== "updated") throw new Error("Expected updated");
    const fresh = await updateGuideForAdmin(
      guideInput({
        id: created.id,
        title: "Second editor's title",
        expectedUpdatedAt: first.updatedAt,
      }),
    );
    expect(fresh.status).toBe("updated");
  });

  it("leaves the edit token alone when the status changes, so publishing never makes the editor's next save conflict", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");
    expect(await publishGuideForAdmin(created.id)).toBe("updated");
    expect(await archiveGuideForAdmin(created.id)).toBe("updated");
    expect(await revertGuideToDraftForAdmin(created.id)).toBe("updated");
    const saved = await updateGuideForAdmin(
      guideInput({ id: created.id, expectedUpdatedAt: created.updatedAt }),
    );
    expect(saved.status).toBe("updated");
  });

  it("refuses an edit that would take a published guide below the publishing checks", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");
    expect(await publishGuideForAdmin(created.id)).toBe("updated");

    const refused = await updateGuideForAdmin(
      guideInput({ id: created.id, reviewDueAt: undefined }),
    );
    expect(refused.status).toBe("invalid");
    expect((await getGuideForAdmin(created.id))?.reviewDueAt).not.toBeNull();

    // As a draft the same edit is allowed.
    await revertGuideToDraftForAdmin(created.id);
    const allowed = await updateGuideForAdmin(
      guideInput({ id: created.id, reviewDueAt: undefined }),
    );
    expect(allowed.status).toBe("updated");
  });

  it("does not expose a linked place that is not active", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");
    await publishGuideForAdmin(created.id);
    await getDatabase()
      .update(place)
      .set({ status: "hidden" })
      .where(eq(place.id, fixture.placeId));

    const bySlug = await getPublicGuideBySlug("fixture-independent-coffee");
    expect(bySlug?.title).toBeDefined();
    expect(bySlug?.place).toBeNull();
  });

  it("answers not found for an unknown or malformed guide id", async () => {
    expect(
      await getGuideForAdmin("00000000-0000-4000-8000-0000000009ff"),
    ).toBeNull();
    expect(await getGuideForAdmin("not-an-id")).toBeNull();
    expect(
      (
        await updateGuideForAdmin(
          guideInput({
            id: "00000000-0000-4000-8000-0000000009ff",
            expectedUpdatedAt: new Date().toISOString(),
          }),
        )
      ).status,
    ).toBe("not_found");
  });

  it("keeps section ids stable across a save so reordering never changes identity", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");
    const before = (await getGuideForAdmin(created.id))?.sections ?? [];
    const reordered = [...before].reverse();
    const updated = await updateGuideForAdmin(
      guideInput({ id: created.id, sections: reordered }),
    );
    expect(updated.status).toBe("updated");
    const after = (await getGuideForAdmin(created.id))?.sections ?? [];
    expect(after.map((item) => item.id)).toEqual(
      before.map((item) => item.id).reverse(),
    );
  });

  it("updates a guide's fields and reflects the change once published", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");
    await publishGuideForAdmin(created.id);

    const updated = await updateGuideForAdmin(
      guideInput({ id: created.id, title: "A revised local coffee guide" }),
    );
    expect(updated.status).toBe("updated");

    const bySlug = await getPublicGuideBySlug("fixture-independent-coffee");
    expect(bySlug?.title).toBe("A revised local coffee guide");
  });

  it("archives a published guide so it disappears from the public list", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");
    await publishGuideForAdmin(created.id);

    const archived = await archiveGuideForAdmin(created.id);
    expect(archived).toBe("updated");

    const bySlug = await getPublicGuideBySlug("fixture-independent-coffee");
    expect(bySlug).toBeNull();

    const adminList = await listAllGuidesForAdmin("archived");
    if (adminList.state !== "ready") throw new Error("Expected ready");
    expect(
      adminList.guides.some(
        (item) => item.slug === "fixture-independent-coffee",
      ),
    ).toBe(true);
  });

  it("lists a published guide for its linked place but not for an unrelated one", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");
    await publishGuideForAdmin(created.id);

    const forPlace = await listPublicGuidesForPlace(fixture.placeId);
    expect(forPlace.state).toBe("ready");
    if (forPlace.state !== "ready") throw new Error("Expected ready");
    expect(
      forPlace.guides.some(
        (item) => item.slug === "fixture-independent-coffee",
      ),
    ).toBe(true);

    const forOtherPlace = await listPublicGuidesForPlace(
      "00000000-0000-4000-8000-000000000943",
    );
    expect(forOtherPlace.state).toBe("ready");
    if (forOtherPlace.state !== "ready") throw new Error("Expected ready");
    expect(forOtherPlace.guides).toHaveLength(0);
  });

  it("excludes a draft guide from its place's public guide list", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");

    const forPlace = await listPublicGuidesForPlace(fixture.placeId);
    if (forPlace.state !== "ready") throw new Error("Expected ready");
    expect(forPlace.guides).toHaveLength(0);
  });

  it("reverts a published guide back to draft, removing it from the public list", async () => {
    const created = await createGuideForAdmin(guideInput());
    if (created.status !== "created") throw new Error("Expected created");
    await publishGuideForAdmin(created.id);

    const reverted = await revertGuideToDraftForAdmin(created.id);
    expect(reverted).toBe("updated");

    const bySlug = await getPublicGuideBySlug("fixture-independent-coffee");
    expect(bySlug).toBeNull();
  });
});
