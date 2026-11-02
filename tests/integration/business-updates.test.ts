import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import {
  businessUpdate,
  businessUpdatePublish,
} from "@/lib/database/schema/business-operations";
import {
  findUpdatePage,
  listBusinessUpdates,
  listPublicUpdateFeed,
} from "@/modules/businesses/public-updates";
import {
  listStudioUpdates,
  removeStudioUpdate,
  saveStudioUpdate,
  setStudioUpdateState,
} from "@/modules/businesses/updates";
import { updateLimits } from "@/modules/businesses/updates-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000003301",
  categoryId: "00000000-0000-4000-8000-000000003302",
  placeId: "00000000-0000-4000-8000-000000003303",
  businessA: "00000000-0000-4000-8000-000000003304",
  businessB: "00000000-0000-4000-8000-000000003305",
  draftBusiness: "00000000-0000-4000-8000-000000003306",
} as const;

function form(overrides: Record<string, unknown> = {}) {
  return {
    title: "Closed on Monday",
    body: "We are closed on Monday for a staff training day.",
    titleCy: null,
    bodyCy: null,
    ...overrides,
  };
}

async function insertUpdate(
  businessId: string,
  values: Partial<typeof businessUpdate.$inferInsert> = {},
) {
  const [row] = await getDatabase()
    .insert(businessUpdate)
    .values({
      businessId,
      title: "Seeded update",
      body: "A seeded update for tests.",
      status: "published",
      publishedAt: new Date(),
      ...values,
    })
    .returning({
      id: businessUpdate.id,
      status: businessUpdate.status,
      publishedAt: businessUpdate.publishedAt,
    });
  // A published seed counts in the publish log, as a real publish would.
  if (row!.status === "published") {
    await getDatabase()
      .insert(businessUpdatePublish)
      .values({ businessId, publishedAt: row!.publishedAt! });
  }
  return row!.id;
}

async function readUpdate(updateId: string) {
  const [row] = await getDatabase()
    .select()
    .from(businessUpdate)
    .where(eq(businessUpdate.id, updateId));
  return row;
}

describeDatabase("business updates", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.ownerId,
      name: "Update Owner",
      email: "update.owner@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Update fixtures",
      slug: "update-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(place).values({
      id: fixture.placeId,
      canonicalName: "Updateville",
      slug: "updateville",
      placeType: "town",
      editorialSummary: "A fictional place for tests.",
    });
    await database.insert(business).values(
      [
        [fixture.businessA, "a", "published"],
        [fixture.businessB, "b", "published"],
        [fixture.draftBusiness, "draft", "draft"],
      ].map(([id, suffix, status]) => ({
        id: id!,
        tradingName: `Fixture Update ${suffix}`,
        slug: `fixture-update-${suffix}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: status as "published" | "draft",
        createdByUserId: fixture.ownerId,
      })),
    );
    await database.insert(businessLocation).values(
      [fixture.businessA, fixture.businessB, fixture.draftBusiness].map(
        (businessId) => ({
          businessId,
          placeId: fixture.placeId,
          locationType: "service_area",
          isPrimary: true,
        }),
      ),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const id of Object.values(fixture).slice(3)) {
      await database.delete(business).where(eq(business.id, id));
    }
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("owner studio storage", () => {
    it("creates a draft, then publishes it with a date", async () => {
      const draft = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: form(),
        intent: "save",
      });
      expect(draft).toMatchObject({ result: "saved", status: "draft" });
      const row = await readUpdate(draft.id!);
      expect(row?.publishedAt).toBeNull();

      const published = await setStudioUpdateState({
        businessId: fixture.businessA,
        updateId: draft.id!,
        to: "published",
      });
      expect(published).toBe("done");
      const after = await readUpdate(draft.id!);
      expect(after).toMatchObject({ status: "published" });
      expect(after?.publishedAt).toBeInstanceOf(Date);
    });

    it("publishes straight away from the form", async () => {
      const result = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: form(),
        intent: "publish",
      });
      expect(result).toMatchObject({
        result: "saved",
        status: "published",
        newlyPublished: true,
      });
    });

    it("keeps the published date when a published update is edited", async () => {
      const id = await insertUpdate(fixture.businessA, {
        publishedAt: new Date("2026-01-05T10:00:00Z"),
      });
      const before = await readUpdate(id);
      const result = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: id,
        expectedUpdatedAt: before!.updatedAt.getTime(),
        update: form({ title: "Changed headline" }),
        intent: "publish",
      });
      expect(result).toMatchObject({
        result: "saved",
        status: "published",
        newlyPublished: false,
      });
      const after = await readUpdate(id);
      expect(after?.title).toBe("Changed headline");
      expect(after?.publishedAt?.toISOString()).toBe(
        "2026-01-05T10:00:00.000Z",
      );
    });

    it("refuses a stale edit without overwriting", async () => {
      const id = await insertUpdate(fixture.businessA);
      const result = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: id,
        expectedUpdatedAt: 1,
        update: form({ title: "Stale overwrite" }),
        intent: "save",
      });
      expect(result.result).toBe("stale");
      expect((await readUpdate(id))?.title).toBe("Seeded update");
    });

    it("does not let one business edit, publish or delete another's update", async () => {
      const id = await insertUpdate(fixture.businessB, {
        status: "draft",
        publishedAt: null,
      });
      const row = await readUpdate(id);
      await expect(
        saveStudioUpdate({
          businessId: fixture.businessA,
          updateId: id,
          expectedUpdatedAt: row!.updatedAt.getTime(),
          update: form({ title: "Hijacked" }),
          intent: "publish",
        }),
      ).resolves.toMatchObject({ result: "not_found" });
      await expect(
        setStudioUpdateState({
          businessId: fixture.businessA,
          updateId: id,
          to: "published",
        }),
      ).resolves.toBe("not_found");
      await expect(
        removeStudioUpdate({ businessId: fixture.businessA, updateId: id }),
      ).resolves.toMatchObject({ result: "not_found" });
      const untouched = await readUpdate(id);
      expect(untouched).toMatchObject({
        title: "Seeded update",
        status: "draft",
      });
      const listed = await listStudioUpdates(fixture.businessA);
      expect(listed.status === "ok" && listed.updates).toEqual([]);
    });

    it("unpublishes to a draft and gives a fresh date on republish", async () => {
      const id = await insertUpdate(fixture.businessA, {
        publishedAt: new Date("2026-01-05T10:00:00Z"),
      });
      await expect(
        setStudioUpdateState({
          businessId: fixture.businessA,
          updateId: id,
          to: "draft",
        }),
      ).resolves.toBe("done");
      expect((await readUpdate(id))?.status).toBe("draft");
      await expect(
        setStudioUpdateState({
          businessId: fixture.businessA,
          updateId: id,
          to: "draft",
        }),
      ).resolves.toBe("unchanged");
      await setStudioUpdateState({
        businessId: fixture.businessA,
        updateId: id,
        to: "published",
      });
      const again = await readUpdate(id);
      expect(again!.publishedAt!.getTime()).toBeGreaterThan(
        new Date("2026-01-05T10:00:00Z").getTime(),
      );
    });

    it("limits publishing to ten a day but still allows drafts", async () => {
      for (let index = 0; index < updateLimits.publishesPerDay; index += 1) {
        await insertUpdate(fixture.businessA, { title: `Recent ${index}` });
      }
      await expect(
        saveStudioUpdate({
          businessId: fixture.businessA,
          update: form(),
          intent: "publish",
        }),
      ).resolves.toMatchObject({ result: "rate" });
      const draft = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: form(),
        intent: "save",
      });
      expect(draft.result).toBe("saved");
      await expect(
        setStudioUpdateState({
          businessId: fixture.businessA,
          updateId: draft.id!,
          to: "published",
        }),
      ).resolves.toBe("rate");
      // Another business has its own allowance.
      await expect(
        saveStudioUpdate({
          businessId: fixture.businessB,
          update: form(),
          intent: "publish",
        }),
      ).resolves.toMatchObject({ result: "saved" });
    });

    it("counts withdrawn updates towards the daily publish limit", async () => {
      for (let index = 0; index < updateLimits.publishesPerDay; index += 1) {
        const id = await insertUpdate(fixture.businessA);
        await setStudioUpdateState({
          businessId: fixture.businessA,
          updateId: id,
          to: "draft",
        });
      }
      await expect(
        saveStudioUpdate({
          businessId: fixture.businessA,
          update: form(),
          intent: "publish",
        }),
      ).resolves.toMatchObject({ result: "rate" });
    });

    it("does not free the limit when a published update is deleted or re-posted", async () => {
      const ids: string[] = [];
      for (let index = 0; index < updateLimits.publishesPerDay; index += 1) {
        ids.push(await insertUpdate(fixture.businessA));
      }
      await removeStudioUpdate({
        businessId: fixture.businessA,
        updateId: ids[0]!,
      });
      await expect(
        saveStudioUpdate({
          businessId: fixture.businessA,
          update: form(),
          intent: "publish",
        }),
      ).resolves.toMatchObject({ result: "rate" });
      // Withdrawing and re-posting the same update is another publish.
      await setStudioUpdateState({
        businessId: fixture.businessA,
        updateId: ids[1]!,
        to: "draft",
      });
      await expect(
        setStudioUpdateState({
          businessId: fixture.businessA,
          updateId: ids[1]!,
          to: "published",
        }),
      ).resolves.toBe("rate");
    });

    it("publishes updates made more than a day ago without counting them", async () => {
      for (let index = 0; index < updateLimits.publishesPerDay; index += 1) {
        await insertUpdate(fixture.businessA, {
          publishedAt: new Date(Date.now() - 2 * 86_400_000),
        });
      }
      await expect(
        saveStudioUpdate({
          businessId: fixture.businessA,
          update: form(),
          intent: "publish",
        }),
      ).resolves.toMatchObject({ result: "saved" });
    });

    it("stops at the stored-update cap", async () => {
      await getDatabase()
        .insert(businessUpdate)
        .values(
          Array.from({ length: updateLimits.maxUpdates }, (_, index) => ({
            businessId: fixture.businessA,
            title: `Draft ${index}`,
            body: "A draft kept only for the cap test.",
            status: "draft",
          })),
        );
      await expect(
        saveStudioUpdate({
          businessId: fixture.businessA,
          update: form(),
          intent: "save",
        }),
      ).resolves.toMatchObject({ result: "limit" });
    });

    it("rejects data the form checks would have refused", async () => {
      await expect(
        getDatabase().insert(businessUpdate).values({
          businessId: fixture.businessA,
          title: "",
          body: "x",
          status: "draft",
        }),
      ).rejects.toThrow();
      await expect(
        getDatabase().insert(businessUpdate).values({
          businessId: fixture.businessA,
          title: "Published without a date",
          body: "A published update must carry a date.",
          status: "published",
        }),
      ).rejects.toThrow();
    });

    it("deletes an update and cascades with the business", async () => {
      const id = await insertUpdate(fixture.businessA);
      await expect(
        removeStudioUpdate({ businessId: fixture.businessA, updateId: id }),
      ).resolves.toMatchObject({ result: "removed" });
      await expect(
        removeStudioUpdate({ businessId: fixture.businessA, updateId: id }),
      ).resolves.toMatchObject({ result: "not_found" });
      const second = await insertUpdate(fixture.businessB);
      await getDatabase()
        .delete(business)
        .where(eq(business.id, fixture.businessB));
      expect(await readUpdate(second)).toBeUndefined();
    });
  });

  describe("public reads", () => {
    it("shows a business only its published updates, newest first", async () => {
      await insertUpdate(fixture.businessA, {
        title: "Older",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      });
      await insertUpdate(fixture.businessA, {
        title: "Newer",
        publishedAt: new Date("2026-02-01T00:00:00Z"),
      });
      await insertUpdate(fixture.businessA, {
        title: "Secret draft",
        status: "draft",
        publishedAt: null,
      });
      await insertUpdate(fixture.businessB, { title: "Someone else's" });
      const result = await listBusinessUpdates({
        businessId: fixture.businessA,
      });
      expect(result.total).toBe(2);
      expect(result.updates.map((u) => u.title)).toEqual(["Newer", "Older"]);
    });

    it("pages through a business's updates", async () => {
      for (let index = 0; index < 5; index += 1) {
        await insertUpdate(fixture.businessA, {
          title: `Post ${index}`,
          publishedAt: new Date(Date.UTC(2026, 0, index + 1)),
        });
      }
      const second = await listBusinessUpdates({
        businessId: fixture.businessA,
        limit: 2,
        offset: 2,
      });
      expect(second.total).toBe(5);
      expect(second.updates.map((u) => u.title)).toEqual(["Post 2", "Post 1"]);
    });

    it("shows Welsh only when both Welsh fields are written", async () => {
      await insertUpdate(fixture.businessA, {
        title: "Both",
        titleCy: "Y ddau",
        bodyCy: "Testun Cymraeg",
        publishedAt: new Date("2026-02-01T00:00:00Z"),
      });
      await insertUpdate(fixture.businessA, {
        title: "Half",
        titleCy: "Hanner yn unig",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      });
      const welsh = await listBusinessUpdates({
        businessId: fixture.businessA,
        locale: "cy",
      });
      expect(welsh.updates.map((u) => [u.title, u.welsh])).toEqual([
        ["Y ddau", true],
        ["Half", false],
      ]);
      const english = await listBusinessUpdates({
        businessId: fixture.businessA,
        locale: "en",
      });
      expect(english.updates.map((u) => u.title)).toEqual(["Both", "Half"]);
    });

    it("feeds only published updates of published businesses", async () => {
      await insertUpdate(fixture.businessA, { title: "Public one" });
      await insertUpdate(fixture.businessA, {
        title: "Draft one",
        status: "draft",
        publishedAt: null,
      });
      await insertUpdate(fixture.draftBusiness, {
        title: "From a draft business",
      });
      const feed = await listPublicUpdateFeed({ place: "updateville" });
      expect(feed.state).toBe("ready");
      expect(feed.updates.map((u) => u.title)).toEqual(["Public one"]);
      expect(feed.updates[0]).toMatchObject({
        businessSlug: "fixture-update-a",
        placeName: "Updateville",
        categoryName: "Update fixtures",
      });
    });

    it("filters the feed by search, category and place, and by unknown values", async () => {
      await insertUpdate(fixture.businessA, { title: "Autumn menu launches" });
      await insertUpdate(fixture.businessB, { title: "Roadworks outside" });
      const search = await listPublicUpdateFeed({
        query: "autumn",
        place: "updateville",
      });
      expect(search.updates.map((u) => u.title)).toEqual([
        "Autumn menu launches",
      ]);
      const byCategory = await listPublicUpdateFeed({
        category: "update-fixtures",
        place: "updateville",
      });
      expect(byCategory.total).toBe(2);
      const unknown = await listPublicUpdateFeed({
        category: "no-such-category",
      });
      expect(unknown).toMatchObject({ state: "ready", total: 0 });
    });

    it("finds an update by its Welsh wording", async () => {
      await insertUpdate(fixture.businessA, {
        title: "Closed Monday",
        titleCy: "Ar gau ddydd Llun",
        bodyCy: "Rydym ar gau ar gyfer hyfforddiant.",
      });
      const feed = await listPublicUpdateFeed({
        query: "hyfforddiant",
        place: "updateville",
        locale: "cy",
      });
      expect(feed.total).toBe(1);
    });

    it("finds the page that holds one update", async () => {
      const ids: string[] = [];
      for (let index = 0; index < 5; index += 1) {
        ids.push(
          await insertUpdate(fixture.businessA, {
            publishedAt: new Date(Date.UTC(2026, 0, index + 1)),
          }),
        );
      }
      // Newest first: ids[4] is first, ids[0] last; two per page.
      const page = (updateId: string) =>
        findUpdatePage({
          businessId: fixture.businessA,
          updateId,
          pageSize: 2,
        });
      await expect(page(ids[4]!)).resolves.toBe(1);
      await expect(page(ids[2]!)).resolves.toBe(2);
      await expect(page(ids[0]!)).resolves.toBe(3);
      const draft = await insertUpdate(fixture.businessA, {
        status: "draft",
        publishedAt: null,
      });
      await expect(page(draft)).resolves.toBeNull();
      await expect(
        findUpdatePage({
          businessId: fixture.businessB,
          updateId: ids[4]!,
          pageSize: 2,
        }),
      ).resolves.toBeNull();
    });

    it("falls back to page one when the page is past the end", async () => {
      await insertUpdate(fixture.businessA);
      const feed = await listPublicUpdateFeed({
        page: 99,
        place: "updateville",
      });
      expect(feed).toMatchObject({ state: "ready", page: 1, total: 1 });
    });
  });
});
