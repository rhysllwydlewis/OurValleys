import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { notification } from "@/lib/database/schema/notification";
import { MAX_NOTIFICATIONS_PER_USER } from "@/modules/residents/notification-model";
import {
  clearReadNotifications,
  countUnreadNotifications,
  deleteNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  pruneReadNotifications,
  raiseNotification,
  setNotificationRead,
} from "@/modules/residents/notifications";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const ana = "00000000-0000-4000-8000-000000005301";
const ben = "00000000-0000-4000-8000-000000005302";

describeDatabase("account notifications", () => {
  beforeEach(async () => {
    await getDatabase()
      .insert(user)
      .values([
        {
          id: ana,
          name: "Ana",
          email: "notif.ana@example.test",
          emailVerified: true,
        },
        {
          id: ben,
          name: "Ben",
          email: "notif.ben@example.test",
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

  async function idsFor(userId: string) {
    const result = await listNotificationsForUser(userId, {
      group: "all",
      page: 1,
    });
    if (result.state !== "ready") throw new Error("unavailable");
    return result;
  }

  it("raises, counts and lists a notification with cleaned values", async () => {
    expect(
      await raiseNotification(ana, {
        kind: "saved_search_results",
        params: { query: "<i>bakery</i>", count: 2 },
        href: "/search?q=bakery",
      }),
    ).toBe(true);
    const list = await idsFor(ana);
    expect(list.total).toBe(1);
    expect(list.unread).toBe(1);
    expect(list.items[0]).toMatchObject({
      kind: "saved_search_results",
      href: "/search?q=bakery",
      read: false,
    });
    expect(list.items[0]!.params.query).toBe("i bakery /i");
  });

  it("stores no unsafe link", async () => {
    await raiseNotification(ana, {
      kind: "place_digest",
      href: "https://evil.example/x",
    });
    expect((await idsFor(ana)).items[0]!.href).toBeNull();
  });

  it("ignores a repeated dedupe key for the same person but not another", async () => {
    const draft = { kind: "event_reminder", dedupeKey: "event:1" } as const;
    expect(await raiseNotification(ana, draft)).toBe(true);
    expect(await raiseNotification(ana, draft)).toBe(false);
    expect(await raiseNotification(ben, draft)).toBe(true);
    expect((await idsFor(ana)).total).toBe(1);
    expect((await idsFor(ben)).total).toBe(1);
  });

  it("never throws: an unknown person simply gets nothing", async () => {
    expect(
      await raiseNotification("00000000-0000-4000-8000-0000000053ff", {
        kind: "place_digest",
      }),
    ).toBe(false);
  });

  it("scopes every change to the owner of the notification", async () => {
    await raiseNotification(ana, { kind: "place_digest" });
    const id = (await idsFor(ana)).items[0]!.id;

    expect(await setNotificationRead(ben, id, true)).toBe("not_found");
    expect(await deleteNotification(ben, id)).toBe("not_found");
    expect(await markAllNotificationsRead(ben)).toBe("done");
    expect(await clearReadNotifications(ben)).toBe("done");
    expect((await idsFor(ana)).unread).toBe(1);

    expect(await setNotificationRead(ana, id, true)).toBe("done");
    expect(await countUnreadNotifications(ana)).toBe(0);
    expect(await setNotificationRead(ana, id, false)).toBe("done");
    expect(await countUnreadNotifications(ana)).toBe(1);
    expect(await deleteNotification(ana, id)).toBe("done");
    expect(await deleteNotification(ana, id)).toBe("not_found");
  });

  it("filters by group and keeps unread ones when clearing read", async () => {
    await raiseNotification(ana, { kind: "place_digest", dedupeKey: "a" });
    await raiseNotification(ana, { kind: "owner_digest", dedupeKey: "b" });
    const business = await listNotificationsForUser(ana, {
      group: "business",
      page: 1,
    });
    expect(business.state === "ready" && business.items).toHaveLength(1);

    await markAllNotificationsRead(ana);
    await raiseNotification(ana, { kind: "place_digest", dedupeKey: "c" });
    await clearReadNotifications(ana);
    const rest = await idsFor(ana);
    expect(rest.items.map((item) => item.kind)).toEqual(["place_digest"]);
  });

  it("keeps at most the per-person cap, dropping the oldest", async () => {
    const rows = Array.from({ length: MAX_NOTIFICATIONS_PER_USER }, (_, i) => ({
      userId: ana,
      kind: "place_digest",
      dedupeKey: `old:${i}`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
    }));
    await getDatabase().insert(notification).values(rows);
    await raiseNotification(ana, { kind: "place_digest", dedupeKey: "new" });
    const all = await getDatabase()
      .select()
      .from(notification)
      .where(eq(notification.userId, ana));
    expect(all.length).toBeLessThanOrEqual(MAX_NOTIFICATIONS_PER_USER + 1);
    expect(all.some((row) => row.dedupeKey === "new")).toBe(true);
    expect(all.some((row) => row.dedupeKey === "old:0")).toBe(false);
  });

  it("prunes only read notifications past retention", async () => {
    const now = new Date("2026-10-27T12:00:00Z");
    await getDatabase()
      .insert(notification)
      .values([
        {
          userId: ana,
          kind: "place_digest",
          dedupeKey: "old-read",
          readAt: new Date("2026-06-01T00:00:00Z"),
        },
        {
          userId: ana,
          kind: "place_digest",
          dedupeKey: "new-read",
          readAt: new Date("2026-10-20T00:00:00Z"),
        },
        {
          userId: ana,
          kind: "place_digest",
          dedupeKey: "old-unread",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      ]);
    expect(await pruneReadNotifications(now)).toBe(1);
    const keys = (
      await getDatabase()
        .select({ key: notification.dedupeKey })
        .from(notification)
        .where(eq(notification.userId, ana))
    )
      .map((row) => row.key)
      .sort();
    expect(keys).toEqual(["new-read", "old-unread"]);
  });

  it("rejects an invalid kind and a protocol-relative link at the database", async () => {
    await expect(
      getDatabase()
        .insert(notification)
        .values({ userId: ana, kind: "nonsense" }),
    ).rejects.toThrow();
    await expect(
      getDatabase()
        .insert(notification)
        .values({ userId: ana, kind: "place_digest", href: "//evil.example" }),
    ).rejects.toThrow();
  });

  it("is removed with the account", async () => {
    await raiseNotification(ana, { kind: "place_digest" });
    await getDatabase().delete(user).where(eq(user.id, ana));
    const rows = await getDatabase()
      .select()
      .from(notification)
      .where(eq(notification.userId, ana));
    expect(rows).toHaveLength(0);
  });
});
