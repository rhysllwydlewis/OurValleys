import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessMedia,
  category,
  place,
} from "@/lib/database/schema/business";
import {
  businessUpdate,
  businessUpdatePublish,
} from "@/lib/database/schema/business-operations";
import { releaseContentImageIfUnused } from "@/modules/businesses/content-images";
import {
  listBusinessUpdates,
  listPublicUpdateFeed,
} from "@/modules/businesses/public-updates";
import { publishDueUpdates } from "@/modules/businesses/update-scheduling";
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
  ownerId: "00000000-0000-4000-8000-000000003401",
  categoryId: "00000000-0000-4000-8000-000000003402",
  placeId: "00000000-0000-4000-8000-000000003403",
  businessA: "00000000-0000-4000-8000-000000003404",
  businessB: "00000000-0000-4000-8000-000000003405",
} as const;

const now = new Date("2026-06-01T12:00:00Z");
const inOneDay = new Date("2026-06-02T12:00:00Z");

function text(overrides: Record<string, unknown> = {}) {
  return {
    title: "Autumn menu",
    body: "Our autumn menu starts on Monday with new seasonal dishes.",
    titleCy: null,
    bodyCy: null,
    ...overrides,
  };
}

async function read(updateId: string) {
  const [row] = await getDatabase()
    .select()
    .from(businessUpdate)
    .where(eq(businessUpdate.id, updateId));
  return row;
}

async function insertPicture(businessId: string, role = "update") {
  const [row] = await getDatabase()
    .insert(businessMedia)
    .values({
      businessId,
      role,
      storageKey: `business/${businessId}/${role}/${crypto.randomUUID()}.png`,
      altText: "A plate of food",
      contentType: "image/png",
      byteSize: 1000,
    })
    .returning({ id: businessMedia.id });
  return row!.id;
}

async function schedule(businessId: string, at = inOneDay, extra = {}) {
  const outcome = await saveStudioUpdate({
    businessId,
    update: text({ scheduledFor: at }),
    intent: "schedule",
    now,
    ...extra,
  });
  expect(outcome.result).toBe("saved");
  return outcome.id!;
}

describeDatabase("scheduled business updates and pictures", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.ownerId,
      name: "Schedule Owner",
      email: "schedule.owner@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Schedule fixtures",
      slug: "schedule-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(place).values({
      id: fixture.placeId,
      canonicalName: "Scheduleville",
      slug: "scheduleville",
      placeType: "town",
      editorialSummary: "A fictional place for tests.",
    });
    await database.insert(business).values(
      [
        [fixture.businessA, "a"],
        [fixture.businessB, "b"],
      ].map(([id, suffix]) => ({
        id: id!,
        tradingName: `Fixture Schedule ${suffix}`,
        slug: `fixture-schedule-${suffix}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: "published" as const,
        createdByUserId: fixture.ownerId,
      })),
    );
    await database.insert(businessLocation).values(
      [fixture.businessA, fixture.businessB].map((businessId) => ({
        businessId,
        placeId: fixture.placeId,
        locationType: "service_area",
        isPrimary: true,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const id of [fixture.businessA, fixture.businessB]) {
      await database.delete(business).where(eq(business.id, id));
    }
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("scheduling", () => {
    it("holds a scheduled update back from every public list and the publish log", async () => {
      const id = await schedule(fixture.businessA);
      const row = await read(id);
      expect(row).toMatchObject({ status: "scheduled", publishedAt: null });
      expect(row?.scheduledFor?.toISOString()).toBe(inOneDay.toISOString());

      const site = await listBusinessUpdates({ businessId: fixture.businessA });
      expect(site.total).toBe(0);
      const feed = await listPublicUpdateFeed({ place: "scheduleville" });
      expect(feed).toMatchObject({ state: "ready", total: 0 });
      const log = await getDatabase()
        .select()
        .from(businessUpdatePublish)
        .where(eq(businessUpdatePublish.businessId, fixture.businessA));
      expect(log).toHaveLength(0);

      const studio = await listStudioUpdates(fixture.businessA);
      expect(studio.status === "ok" && studio.updates[0]?.status).toBe(
        "scheduled",
      );
    });

    it("refuses a schedule that has no checked time", async () => {
      const outcome = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: text(),
        intent: "schedule",
        now,
      });
      expect(outcome.result).toBe("invalid");
    });

    it("lets the database refuse a scheduled row with no time", async () => {
      await expect(
        getDatabase().insert(businessUpdate).values({
          businessId: fixture.businessA,
          title: "No time",
          body: "A scheduled update with no time at all.",
          status: "scheduled",
        }),
      ).rejects.toThrow();
    });

    it("caps the updates waiting to go live, but lets an existing one be edited", async () => {
      const ids: string[] = [];
      for (let i = 0; i < updateLimits.maxScheduled; i += 1) {
        ids.push(await schedule(fixture.businessA));
      }
      const extra = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: text({ scheduledFor: inOneDay }),
        intent: "schedule",
        now,
      });
      expect(extra.result).toBe("scheduleLimit");
      // Another business has its own allowance.
      await schedule(fixture.businessB);
      // An update that already holds a slot can still be saved.
      const edit = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: ids[0],
        update: text({ title: "Autumn menu, now with soup" }),
        intent: "save",
        now,
      });
      expect(edit.result).toBe("saved");
    });

    it("keeps the old time when a scheduled update is saved without a new one, and moves it with one", async () => {
      const id = await schedule(fixture.businessA);
      const kept = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: id,
        update: text({ title: "Autumn menu v2" }),
        intent: "save",
        now,
      });
      expect(kept).toMatchObject({ result: "saved", status: "scheduled" });
      expect((await read(id))?.scheduledFor?.toISOString()).toBe(
        inOneDay.toISOString(),
      );
      const later = new Date("2026-06-05T09:00:00Z");
      await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: id,
        update: text({ scheduledFor: later }),
        intent: "schedule",
        now,
      });
      expect((await read(id))?.scheduledFor?.toISOString()).toBe(
        later.toISOString(),
      );
    });

    it("publishes a scheduled update right away and clears its time", async () => {
      const id = await schedule(fixture.businessA);
      const outcome = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: id,
        update: text(),
        intent: "publish",
        now,
      });
      expect(outcome).toMatchObject({ result: "saved", newlyPublished: true });
      expect(await read(id)).toMatchObject({
        status: "published",
        scheduledFor: null,
      });
      const site = await listBusinessUpdates({ businessId: fixture.businessA });
      expect(site.total).toBe(1);
    });

    it("cancels a schedule back to a draft", async () => {
      const id = await schedule(fixture.businessA);
      const result = await setStudioUpdateState({
        businessId: fixture.businessA,
        updateId: id,
        to: "draft",
        now,
      });
      expect(result).toBe("done");
      expect(await read(id)).toMatchObject({
        status: "draft",
        scheduledFor: null,
      });
    });

    it("cannot schedule, change or cancel another business's update", async () => {
      const id = await schedule(fixture.businessA);
      const edit = await saveStudioUpdate({
        businessId: fixture.businessB,
        updateId: id,
        update: text({ scheduledFor: inOneDay }),
        intent: "schedule",
        now,
      });
      expect(edit.result).toBe("not_found");
      await expect(
        setStudioUpdateState({
          businessId: fixture.businessB,
          updateId: id,
          to: "draft",
          now,
        }),
      ).resolves.toBe("not_found");
      expect((await read(id))?.status).toBe("scheduled");
    });

    it("does not let a published update be moved back onto the schedule", async () => {
      const created = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: text(),
        intent: "publish",
        now,
      });
      const outcome = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: created.id,
        update: text({ scheduledFor: inOneDay }),
        intent: "schedule",
        now,
      });
      expect(outcome).toMatchObject({ result: "saved", status: "published" });
      expect((await read(created.id!))?.scheduledFor).toBeNull();
    });
  });

  describe("publishDueUpdates", () => {
    it("publishes what is due, at the moment of publishing, and leaves the rest", async () => {
      const due = await schedule(
        fixture.businessA,
        new Date("2026-06-01T12:30:00Z"),
      );
      const future = await schedule(fixture.businessA, inOneDay);
      const other = await schedule(
        fixture.businessB,
        new Date("2026-06-01T12:45:00Z"),
      );
      const clock = new Date("2026-06-01T13:00:00Z");

      const result = await publishDueUpdates(clock);
      expect(result).toEqual({ published: 2, failed: 0, deferred: 0 });

      expect(await read(due)).toMatchObject({
        status: "published",
        scheduledFor: null,
      });
      expect((await read(due))?.publishedAt?.toISOString()).toBe(
        clock.toISOString(),
      );
      expect((await read(other))?.status).toBe("published");
      expect((await read(future))?.status).toBe("scheduled");

      const log = await getDatabase()
        .select()
        .from(businessUpdatePublish)
        .where(eq(businessUpdatePublish.businessId, fixture.businessA));
      expect(log).toHaveLength(1);
      const site = await listBusinessUpdates({ businessId: fixture.businessA });
      expect(site.updates.map((u) => u.id)).toEqual([due]);
    });

    it("is safe to run again and ignores drafts, cancelled and taken-down updates", async () => {
      const cancelled = await schedule(
        fixture.businessA,
        new Date("2026-06-01T12:30:00Z"),
      );
      await setStudioUpdateState({
        businessId: fixture.businessA,
        updateId: cancelled,
        to: "draft",
        now,
      });
      const [taken] = await getDatabase()
        .insert(businessUpdate)
        .values({
          businessId: fixture.businessA,
          title: "Taken down",
          body: "An update an administrator removed.",
          status: "removed",
          publishedAt: new Date("2026-05-01T00:00:00Z"),
        })
        .returning({ id: businessUpdate.id });
      const real = await schedule(
        fixture.businessA,
        new Date("2026-06-01T12:30:00Z"),
      );
      const clock = new Date("2026-06-01T13:00:00Z");

      await expect(publishDueUpdates(clock)).resolves.toEqual({
        published: 1,
        failed: 0,
        deferred: 0,
      });
      await expect(publishDueUpdates(clock)).resolves.toEqual({
        published: 0,
        failed: 0,
        deferred: 0,
      });
      expect((await read(cancelled))?.status).toBe("draft");
      expect((await read(taken!.id))?.status).toBe("removed");
      expect((await read(real))?.status).toBe("published");
    });
  });

  describe("daily limit", () => {
    it("defers due updates once the business has used its daily allowance", async () => {
      const clock = new Date("2026-06-01T13:00:00Z");
      await getDatabase()
        .insert(businessUpdatePublish)
        .values(
          Array.from({ length: updateLimits.publishesPerDay }, () => ({
            businessId: fixture.businessA,
            publishedAt: new Date("2026-06-01T12:00:00Z"),
          })),
        );
      const held = await schedule(
        fixture.businessA,
        new Date("2026-06-01T12:30:00Z"),
      );
      const other = await schedule(
        fixture.businessB,
        new Date("2026-06-01T12:30:00Z"),
      );
      const result = await publishDueUpdates(clock);
      expect(result).toEqual({ published: 1, failed: 0, deferred: 1 });
      expect((await read(held))?.status).toBe("scheduled");
      expect((await read(other))?.status).toBe("published");
      // A day later the window has emptied and it goes out.
      const later = await publishDueUpdates(new Date("2026-06-02T13:00:00Z"));
      expect(later.published).toBe(1);
      expect((await read(held))?.status).toBe("published");
    });
  });

  describe("batching", () => {
    it("does not let deferred rows hide later due updates", async () => {
      const clock = new Date("2026-06-01T13:00:00Z");
      await getDatabase()
        .insert(businessUpdatePublish)
        .values(
          Array.from({ length: updateLimits.publishesPerDay }, () => ({
            businessId: fixture.businessA,
            publishedAt: new Date("2026-06-01T12:00:00Z"),
          })),
        );
      // Business A is at its limit and its rows are the oldest; fill more than
      // one batch of them (200) so business B's row sits behind the first batch.
      await getDatabase()
        .insert(businessUpdate)
        .values(
          Array.from({ length: 210 }, (_, i) => ({
            businessId: fixture.businessA,
            title: `Held ${i}`,
            body: "A held update that is due but over the daily limit.",
            status: "scheduled",
            scheduledFor: new Date("2026-06-01T11:00:00Z"),
          })),
        );
      const other = await schedule(
        fixture.businessB,
        new Date("2026-06-01T12:30:00Z"),
      );
      const result = await publishDueUpdates(clock);
      expect(result.published).toBe(1);
      expect(result.deferred).toBeGreaterThan(0);
      expect((await read(other))?.status).toBe("published");
    });
  });

  describe("pictures", () => {
    it("attaches the business's own picture and shows it publicly", async () => {
      const picture = await insertPicture(fixture.businessA);
      const created = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: text(),
        intent: "publish",
        imageMediaId: picture,
        now,
      });
      expect(created.result).toBe("saved");
      const site = await listBusinessUpdates({ businessId: fixture.businessA });
      expect(site.updates[0]?.image).toMatchObject({
        id: picture,
        altText: "A plate of food",
      });
      const feed = await listPublicUpdateFeed({ place: "scheduleville" });
      expect(feed.updates[0]?.image?.id).toBe(picture);
      const studio = await listStudioUpdates(fixture.businessA);
      expect(studio.status === "ok" && studio.updates[0]?.image?.id).toBe(
        picture,
      );
    });

    it("refuses another business's picture and a picture of the wrong kind", async () => {
      const foreign = await insertPicture(fixture.businessB);
      const wrongKind = await insertPicture(fixture.businessA, "offer");
      for (const imageMediaId of [foreign, wrongKind]) {
        const outcome = await saveStudioUpdate({
          businessId: fixture.businessA,
          update: text(),
          intent: "save",
          imageMediaId,
          now,
        });
        expect(outcome.result).toBe("invalid");
      }
      const studio = await listStudioUpdates(fixture.businessA);
      expect(studio.status === "ok" && studio.updates).toHaveLength(0);
    });

    it("leaves the picture alone unless told, and reports a replaced one", async () => {
      const first = await insertPicture(fixture.businessA);
      const second = await insertPicture(fixture.businessA);
      const created = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: text(),
        intent: "save",
        imageMediaId: first,
        now,
      });
      const untouched = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: created.id,
        update: text({ title: "Autumn menu v2" }),
        intent: "save",
        now,
      });
      expect(untouched.replacedImageMediaId).toBeNull();
      expect((await read(created.id!))?.imageMediaId).toBe(first);

      const swapped = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: created.id,
        update: text(),
        intent: "save",
        imageMediaId: second,
        now,
      });
      expect(swapped.replacedImageMediaId).toBe(first);
      await releaseContentImageIfUnused({
        businessId: fixture.businessA,
        mediaId: swapped.replacedImageMediaId,
      });
      const [retired] = await getDatabase()
        .select({ status: businessMedia.status })
        .from(businessMedia)
        .where(eq(businessMedia.id, first));
      expect(retired?.status).toBe("removed");

      const cleared = await saveStudioUpdate({
        businessId: fixture.businessA,
        updateId: created.id,
        update: text(),
        intent: "save",
        imageMediaId: null,
        now,
      });
      expect(cleared.replacedImageMediaId).toBe(second);
      expect((await read(created.id!))?.imageMediaId).toBeNull();
    });

    it("hands back the picture of a deleted update so it can be retired", async () => {
      const picture = await insertPicture(fixture.businessA);
      const created = await saveStudioUpdate({
        businessId: fixture.businessA,
        update: text(),
        intent: "save",
        imageMediaId: picture,
        now,
      });
      await expect(
        removeStudioUpdate({
          businessId: fixture.businessB,
          updateId: created.id!,
        }),
      ).resolves.toMatchObject({ result: "not_found" });
      const removed = await removeStudioUpdate({
        businessId: fixture.businessA,
        updateId: created.id!,
      });
      expect(removed).toEqual({ result: "removed", imageMediaId: picture });
      await releaseContentImageIfUnused({
        businessId: fixture.businessA,
        mediaId: removed.imageMediaId,
      });
      const [retired] = await getDatabase()
        .select({ status: businessMedia.status })
        .from(businessMedia)
        .where(eq(businessMedia.id, picture));
      expect(retired?.status).toBe("removed");
    });

    it("does not retire a picture that another update still uses", async () => {
      const picture = await insertPicture(fixture.businessA);
      const ids = [];
      for (let i = 0; i < 2; i += 1) {
        const created = await saveStudioUpdate({
          businessId: fixture.businessA,
          update: text(),
          intent: "save",
          imageMediaId: picture,
          now,
        });
        ids.push(created.id!);
      }
      const removed = await removeStudioUpdate({
        businessId: fixture.businessA,
        updateId: ids[0]!,
      });
      await releaseContentImageIfUnused({
        businessId: fixture.businessA,
        mediaId: removed.imageMediaId,
      });
      const [still] = await getDatabase()
        .select({ status: businessMedia.status })
        .from(businessMedia)
        .where(eq(businessMedia.id, picture));
      expect(still?.status).toBe("active");
    });
  });
});
