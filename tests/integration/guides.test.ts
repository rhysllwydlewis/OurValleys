import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { place } from "@/lib/database/schema/business";
import { guide } from "@/lib/database/schema/guides";
import {
  archiveGuideForAdmin,
  createGuideForAdmin,
  listAllGuidesForAdmin,
  publishGuideForAdmin,
  revertGuideToDraftForAdmin,
  updateGuideForAdmin,
} from "@/modules/guides/admin";
import {
  getPublicGuideBySlug,
  listPublicGuides,
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
    sections: [validSection],
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
    expect(listed?.sections).toEqual([validSection]);

    const bySlug = await getPublicGuideBySlug("fixture-independent-coffee");
    expect(bySlug?.title).toBe("Independent coffee across the Valleys");
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
