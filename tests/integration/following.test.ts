import { eq, inArray } from "drizzle-orm";
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
  businessEvent,
  businessOffer,
  businessUpdate,
} from "@/lib/database/schema/business-operations";
import { jobCursor } from "@/lib/database/schema/job-cursor";
import { notification } from "@/lib/database/schema/notification";
import { savedBusiness } from "@/lib/database/schema/saved-discovery";
import { runFollowedNotices } from "@/modules/residents/followed-notices";
import {
  loadFollowingOverview,
  setAllSavedBusinessNotify,
  setSavedBusinessNotify,
} from "@/modules/residents/following";
import { FOLLOW_CURSOR_NAME } from "@/modules/residents/following-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ana: "00000000-0000-4000-8000-000000006001",
  ben: "00000000-0000-4000-8000-000000006002",
  banned: "00000000-0000-4000-8000-000000006003",
  categoryId: "00000000-0000-4000-8000-000000006004",
  placeId: "00000000-0000-4000-8000-000000006005",
  bakery: "00000000-0000-4000-8000-000000006006",
  demo: "00000000-0000-4000-8000-000000006007",
  draft: "00000000-0000-4000-8000-000000006008",
} as const;

const now = new Date("2026-10-27T12:00:00.000Z");
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000);

async function notificationsFor(userId: string) {
  return getDatabase()
    .select()
    .from(notification)
    .where(eq(notification.userId, userId));
}

describeDatabase("following saved businesses", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ana,
        name: "Ana",
        email: "follow.ana@example.test",
        emailVerified: true,
      },
      {
        id: fixture.ben,
        name: "Ben",
        email: "follow.ben@example.test",
        emailVerified: true,
      },
      {
        id: fixture.banned,
        name: "Banned",
        email: "follow.banned@example.test",
        emailVerified: true,
        banned: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Follow fixtures",
      slug: "follow-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(place).values({
      id: fixture.placeId,
      canonicalName: "Followville",
      slug: "followville",
      placeType: "town",
      editorialSummary: "A fictional place for tests.",
    });
    await database.insert(business).values(
      [
        [fixture.bakery, "bakery", "published", false],
        [fixture.demo, "demo", "published", true],
        [fixture.draft, "draft", "draft", false],
      ].map(([id, slug, status, isDemo]) => ({
        id: id as string,
        tradingName: `Fixture Follow ${slug}`,
        slug: `fixture-follow-${slug}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: status as "published" | "draft",
        isDemo: isDemo as boolean,
        createdByUserId: fixture.ana,
      })),
    );
    await database.insert(businessLocation).values(
      [fixture.bakery, fixture.demo, fixture.draft].map((businessId) => ({
        businessId,
        placeId: fixture.placeId,
        locationType: "service_area",
        isPrimary: true,
      })),
    );
    await database.insert(savedBusiness).values([
      { userId: fixture.ana, businessId: fixture.bakery },
      { userId: fixture.ana, businessId: fixture.demo },
      { userId: fixture.banned, businessId: fixture.bakery },
    ]);
    await database
      .insert(jobCursor)
      .values({ name: FOLLOW_CURSOR_NAME, cursorAt: minutesAgo(30) })
      .onConflictDoUpdate({
        target: jobCursor.name,
        set: { cursorAt: minutesAgo(30) },
      });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(business)
      .where(
        inArray(business.id, [fixture.bakery, fixture.demo, fixture.draft]),
      );
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database
      .delete(user)
      .where(inArray(user.id, [fixture.ana, fixture.ben, fixture.banned]));
    await database
      .delete(jobCursor)
      .where(eq(jobCursor.name, FOLLOW_CURSOR_NAME));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function publishUpdate(businessId: string, minutes = 10) {
    const [row] = await getDatabase()
      .insert(businessUpdate)
      .values({
        businessId,
        title: "Closed on Monday",
        body: "Staff training day.",
        status: "published",
        publishedAt: minutesAgo(minutes),
      })
      .returning({ id: businessUpdate.id });
    return row!.id;
  }

  it("notifies savers of a new update once, and not again on a rerun", async () => {
    const updateId = await publishUpdate(fixture.bakery);
    const first = await runFollowedNotices(now);
    expect(first.raised).toBe(1);
    const rows = await notificationsFor(fixture.ana);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "followed_update",
      href: `/b/fixture-follow-bakery/updates?update=${updateId}`,
      params: { business: "Fixture Follow bakery", title: "Closed on Monday" },
    });

    // Another run covers only the time since the cursor, and the dedupe key
    // would stop a repeat even if the cursor were reset.
    expect(
      (await runFollowedNotices(new Date(now.getTime() + 60_000))).raised,
    ).toBe(0);
    await getDatabase()
      .update(jobCursor)
      .set({ cursorAt: minutesAgo(30) })
      .where(eq(jobCursor.name, FOLLOW_CURSOR_NAME));
    expect((await runFollowedNotices(now)).raised).toBe(0);
    expect(await notificationsFor(fixture.ana)).toHaveLength(1);
  });

  it("tells nobody who did not save the business, and nobody banned", async () => {
    await publishUpdate(fixture.bakery);
    await runFollowedNotices(now);
    expect(await notificationsFor(fixture.ben)).toHaveLength(0);
    expect(await notificationsFor(fixture.banned)).toHaveLength(0);
  });

  it("skips muted, demonstration and unpublished businesses", async () => {
    await getDatabase().insert(savedBusiness).values({
      userId: fixture.ben,
      businessId: fixture.draft,
    });
    await getDatabase()
      .update(savedBusiness)
      .set({ notify: false })
      .where(eq(savedBusiness.userId, fixture.ana));
    await publishUpdate(fixture.bakery);
    await publishUpdate(fixture.demo);
    await publishUpdate(fixture.draft);
    expect((await runFollowedNotices(now)).raised).toBe(0);
  });

  it("raises offers and events, but not hidden, expired or past ones", async () => {
    const database = getDatabase();
    await database.insert(businessOffer).values([
      {
        businessId: fixture.bakery,
        title: "Two for one",
        description: "Fictional.",
        status: "active",
        createdAt: minutesAgo(5),
        updatedAt: minutesAgo(5),
      },
      {
        businessId: fixture.bakery,
        title: "Hidden offer",
        description: "Fictional.",
        status: "hidden",
        createdAt: minutesAgo(5),
        updatedAt: minutesAgo(5),
      },
      {
        businessId: fixture.bakery,
        title: "Expired offer",
        description: "Fictional.",
        status: "active",
        endsAt: minutesAgo(3),
        createdAt: minutesAgo(5),
        updatedAt: minutesAgo(5),
      },
    ]);
    await database.insert(businessEvent).values([
      {
        businessId: fixture.bakery,
        title: "Bake night",
        description: "Fictional.",
        status: "active",
        startsAt: new Date(now.getTime() + 86_400_000),
        createdAt: minutesAgo(5),
        updatedAt: minutesAgo(5),
      },
      {
        businessId: fixture.bakery,
        title: "Past event",
        description: "Fictional.",
        status: "active",
        startsAt: minutesAgo(600),
        createdAt: minutesAgo(5),
        updatedAt: minutesAgo(5),
      },
    ]);
    await runFollowedNotices(now);
    const rows = await notificationsFor(fixture.ana);
    expect(rows.map((row) => row.kind).sort()).toEqual([
      "followed_event",
      "followed_offer",
    ]);
    const event = rows.find((row) => row.kind === "followed_event");
    expect(event?.href).toMatch(/^\/events\//);
    expect(event?.params).toMatchObject({ title: "Bake night" });
  });

  it("announces an offer when it goes live or starts, not when it was drafted", async () => {
    const database = getDatabase();
    // Drafted last week, switched on 5 minutes ago.
    await database.insert(businessOffer).values({
      businessId: fixture.bakery,
      title: "Switched on today",
      description: "Fictional.",
      status: "active",
      createdAt: new Date(now.getTime() - 5 * 86_400_000),
      updatedAt: minutesAgo(5),
    });
    // Edited long ago but only starts now.
    await database.insert(businessOffer).values({
      businessId: fixture.bakery,
      title: "Starts today",
      description: "Fictional.",
      status: "active",
      createdAt: new Date(now.getTime() - 5 * 86_400_000),
      updatedAt: new Date(now.getTime() - 4 * 86_400_000),
      startsAt: minutesAgo(8),
    });
    // Active for weeks and edited just now: too old to announce.
    await database.insert(businessOffer).values({
      businessId: fixture.bakery,
      title: "Long running",
      description: "Fictional.",
      status: "active",
      createdAt: new Date(now.getTime() - 40 * 86_400_000),
      updatedAt: minutesAgo(5),
    });
    await runFollowedNotices(now);
    const titles = (await notificationsFor(fixture.ana)).map(
      (row) => (row.params as { title: string }).title,
    );
    expect(titles.sort()).toEqual(["Starts today", "Switched on today"]);
  });

  it("reaches every follower of a popular business, however many", async () => {
    const database = getDatabase();
    const ids = Array.from(
      { length: 520 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(900000 + index).padStart(12, "0")}`,
    );
    await database.insert(user).values(
      ids.map((id, index) => ({
        id,
        name: `Follower ${index}`,
        email: `follow.many.${index}@example.test`,
        emailVerified: true,
      })),
    );
    try {
      await database
        .insert(savedBusiness)
        .values(ids.map((userId) => ({ userId, businessId: fixture.bakery })));
      await publishUpdate(fixture.bakery);
      const result = await runFollowedNotices(now);
      expect(result.raised).toBe(521);
      const rows = await database
        .select({ id: notification.id })
        .from(notification)
        .where(inArray(notification.userId, ids));
      expect(rows).toHaveLength(520);
    } finally {
      await database.delete(user).where(inArray(user.id, ids));
    }
  });

  it("ignores posts older than the cursor and advances it", async () => {
    await publishUpdate(fixture.bakery, 90);
    expect((await runFollowedNotices(now)).raised).toBe(0);
    const [cursor] = await getDatabase()
      .select()
      .from(jobCursor)
      .where(eq(jobCursor.name, FOLLOW_CURSOR_NAME));
    expect(cursor?.cursorAt.toISOString()).toBe(minutesAgo(2).toISOString());
  });

  it("starts an hour back when no run has happened yet", async () => {
    await getDatabase()
      .delete(jobCursor)
      .where(eq(jobCursor.name, FOLLOW_CURSOR_NAME));
    await publishUpdate(fixture.bakery, 50);
    await publishUpdate(fixture.bakery, 120);
    expect((await runFollowedNotices(now)).raised).toBe(1);
  });

  describe("the notice switches", () => {
    it("changes only the signed-in person's own saved business", async () => {
      expect(await setSavedBusinessNotify(ben(), fixture.bakery, false)).toBe(
        "not_found",
      );
      expect(
        await setSavedBusinessNotify(fixture.ana, fixture.draft, false),
      ).toBe("not_found");
      expect(
        await setSavedBusinessNotify(fixture.ana, "not-an-id", false),
      ).toBe("invalid");
      expect(
        await setSavedBusinessNotify(fixture.ana, fixture.bakery, false),
      ).toBe("done");

      const rows = await getDatabase().select().from(savedBusiness);
      const notify = (userId: string, businessId: string) =>
        rows.find(
          (row) => row.userId === userId && row.businessId === businessId,
        )?.notify;
      expect(notify(fixture.ana, fixture.bakery)).toBe(false);
      expect(notify(fixture.ana, fixture.demo)).toBe(true);
      expect(notify(fixture.banned, fixture.bakery)).toBe(true);
    });

    it("turns every saved business off and on for one person only", async () => {
      expect(await setAllSavedBusinessNotify(fixture.ana, false)).toBe("done");
      const rows = await getDatabase().select().from(savedBusiness);
      expect(
        rows
          .filter((row) => row.userId === fixture.ana)
          .every((row) => !row.notify),
      ).toBe(true);
      expect(
        rows
          .filter((row) => row.userId === fixture.banned)
          .every((row) => row.notify),
      ).toBe(true);
      expect(await setAllSavedBusinessNotify("nope", true)).toBe("invalid");
    });
  });

  describe("the following page data", () => {
    it("lists own saved businesses and recent public activity only", async () => {
      await publishUpdate(fixture.bakery, 5);
      await getDatabase().insert(businessOffer).values({
        businessId: fixture.bakery,
        title: "Draft offer",
        description: "Fictional.",
        status: "draft",
      });
      const overview = await loadFollowingOverview(fixture.ana, now);
      if (overview.state !== "ready") throw new Error("unavailable");
      expect(overview.businesses.map((row) => row.slug).sort()).toEqual([
        "fixture-follow-bakery",
        "fixture-follow-demo",
      ]);
      expect(overview.feed.map((item) => item.title)).toEqual([
        "Closed on Monday",
      ]);

      const stranger = await loadFollowingOverview(fixture.ben, now);
      expect(stranger).toMatchObject({
        state: "ready",
        businesses: [],
        feed: [],
      });
      expect(await loadFollowingOverview("not-an-id", now)).toEqual({
        state: "unavailable",
      });
    });
  });
});

function ben() {
  return fixture.ben;
}
