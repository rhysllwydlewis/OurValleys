import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { notification } from "@/lib/database/schema/notification";
import { savedSearch } from "@/lib/database/schema/saved-search";
import { buildUserDataExport } from "@/modules/identity/data-export";
import {
  listMutedKinds,
  saveNoticePreferences,
} from "@/modules/residents/notice-preferences";
import { NOTIFICATION_KINDS } from "@/modules/residents/notification-model";
import { raiseNotification } from "@/modules/residents/notifications";
import { readPrivacySummary } from "@/modules/residents/privacy-summary";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const ana = "00000000-0000-4000-8000-000000006101";
const ben = "00000000-0000-4000-8000-000000006102";

describeDatabase("privacy and notice preferences", () => {
  beforeEach(async () => {
    await getDatabase()
      .insert(user)
      .values([
        {
          id: ana,
          name: "Ana",
          email: "privacy.ana@example.test",
          emailVerified: true,
        },
        {
          id: ben,
          name: "Ben",
          email: "privacy.ben@example.test",
          emailVerified: true,
        },
      ]);
  });

  afterEach(async () => {
    for (const id of [ana, ben]) {
      await getDatabase().delete(user).where(eq(user.id, id));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("starts with every kind on, so nobody loses a notice by default", async () => {
    expect((await listMutedKinds(ana)).size).toBe(0);
    expect(
      await raiseNotification(ana, { kind: "place_digest", dedupeKey: "d1" }),
    ).toBe(true);
  });

  it("stops raising a muted kind for that person only", async () => {
    expect(
      await saveNoticePreferences(
        ana,
        NOTIFICATION_KINDS.filter((kind) => kind !== "place_digest"),
      ),
    ).toBe("saved");
    expect([...(await listMutedKinds(ana))]).toEqual(["place_digest"]);

    expect(
      await raiseNotification(ana, { kind: "place_digest", dedupeKey: "m1" }),
    ).toBe(false);
    expect(
      await raiseNotification(ana, { kind: "event_reminder", dedupeKey: "m2" }),
    ).toBe(true);
    // Ben never muted anything.
    expect(
      await raiseNotification(ben, { kind: "place_digest", dedupeKey: "m1" }),
    ).toBe(true);
    expect((await listMutedKinds(ben)).size).toBe(0);
  });

  it("replaces the previous choices and turns a kind back on", async () => {
    await saveNoticePreferences(ana, []);
    expect((await listMutedKinds(ana)).size).toBe(NOTIFICATION_KINDS.length);
    await saveNoticePreferences(ana, ["followed_update"]);
    const muted = await listMutedKinds(ana);
    expect(muted.has("followed_update")).toBe(false);
    expect(muted.size).toBe(NOTIFICATION_KINDS.length - 1);
    expect(
      await raiseNotification(ana, {
        kind: "followed_update",
        dedupeKey: "back-on",
      }),
    ).toBe(true);
  });

  it("does not touch another person's choices when saving", async () => {
    await saveNoticePreferences(ben, ["owner_digest"]);
    await saveNoticePreferences(ana, [...NOTIFICATION_KINDS]);
    expect((await listMutedKinds(ben)).size).toBe(
      NOTIFICATION_KINDS.length - 1,
    );
    expect((await listMutedKinds(ana)).size).toBe(0);
  });

  it("counts only the signed-in person's own data", async () => {
    const database = getDatabase();
    await database.insert(savedSearch).values({
      userId: ana,
      query: "bakery",
      queryKey: "bakery",
      type: "all",
    });
    await database.insert(notification).values([
      { userId: ana, kind: "place_digest" },
      { userId: ana, kind: "event_reminder" },
      { userId: ben, kind: "place_digest" },
    ]);
    const summary = await readPrivacySummary(ana);
    expect(summary.state).toBe("ready");
    if (summary.state !== "ready") return;
    expect(summary.holdings.savedSearches).toBe(1);
    expect(summary.holdings.notifications).toBe(2);
    expect(summary.holdings.reviews).toBe(0);
    const other = await readPrivacySummary(ben);
    if (other.state !== "ready") throw new Error("expected ready");
    expect(other.holdings.savedSearches).toBe(0);
    expect(other.holdings.notifications).toBe(1);
  });

  it("includes saved searches, notices and choices in the data export, and nobody else's", async () => {
    const database = getDatabase();
    await database.insert(savedSearch).values([
      { userId: ana, query: "bakery", queryKey: "bakery", type: "all" },
      { userId: ben, query: "plumber", queryKey: "plumber", type: "all" },
    ]);
    await database.insert(notification).values([
      {
        userId: ana,
        kind: "place_digest",
        params: { count: 2 },
        href: "/account/saved",
      },
      { userId: ben, kind: "owner_digest" },
    ]);
    await saveNoticePreferences(ana, ["place_digest"]);

    const dataExport = await buildUserDataExport(ana);
    expect(dataExport?.savedSearches.map((s) => s.query)).toEqual(["bakery"]);
    expect(dataExport?.notifications).toHaveLength(1);
    expect(dataExport?.notifications[0]).toMatchObject({
      kind: "place_digest",
      details: { count: 2 },
      link: "/account/saved",
      read: false,
    });
    expect(dataExport?.mutedNoticeKinds).toHaveLength(
      NOTIFICATION_KINDS.length - 1,
    );
    expect(JSON.stringify(dataExport)).not.toContain("plumber");
  });

  it("removes the choices when the account is deleted", async () => {
    await saveNoticePreferences(ana, []);
    await getDatabase().delete(user).where(eq(user.id, ana));
    expect((await listMutedKinds(ana)).size).toBe(0);
  });
});
