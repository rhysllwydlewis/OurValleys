import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { place } from "@/lib/database/schema/business";
import { editorialView } from "@/lib/database/schema/business-operations";
import { guide } from "@/lib/database/schema/guides";
import { localStory } from "@/lib/database/schema/local-stories";
import { purgePlatformData } from "@/modules/platform/data-retention";
import {
  getEditorialInsights,
  recordEditorialView,
} from "@/modules/platform/editorial-insights";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const id = (n: number) => `00000000-0000-4000-8000-0000000012${n}`;
const f = {
  place: id(10),
  inactivePlace: id(11),
  guideLive: id(12),
  guideDraft: id(13),
  storyLive: id(14),
  storyScheduled: id(15),
  storyDraft: id(16),
} as const;
const ids = Object.values(f);

const minutes = (n: number) => new Date(Date.now() + n * 60_000);
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

describeDatabase("editorial views and insights", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(place).values([
      {
        id: f.place,
        canonicalName: "Fixture Insight Place",
        slug: "fixture-insight-place",
        placeType: "town",
        editorialSummary: "Fictional place used only by automated tests.",
      },
      {
        id: f.inactivePlace,
        canonicalName: "Fixture Retired Place",
        slug: "fixture-retired-place",
        placeType: "town",
        status: "inactive",
        editorialSummary: "Fictional place used only by automated tests.",
      },
    ]);
    const guideBase = {
      summary: "Fictional guide used only by automated tests.",
      areaLabel: "Fixture",
      readingTime: "2 min",
      authorName: "Fixture Author",
    };
    await database.insert(guide).values([
      {
        ...guideBase,
        id: f.guideLive,
        slug: "fixture-insight-guide",
        title: "Fixture insight guide",
        status: "published",
        publishedAt: days(-3),
      },
      {
        ...guideBase,
        id: f.guideDraft,
        slug: "fixture-insight-draft-guide",
        title: "Fixture draft guide",
        status: "draft",
      },
    ]);
    const storyBase = {
      summary: "Fictional story used only by automated tests.",
      body: "Fictional body used only by automated tests.",
      authorName: "Fixture Author",
    };
    await database.insert(localStory).values([
      {
        ...storyBase,
        id: f.storyLive,
        slug: "fixture-insight-story",
        title: "Fixture insight story",
        status: "published",
        publishedAt: days(-1),
      },
      {
        ...storyBase,
        id: f.storyScheduled,
        slug: "fixture-insight-scheduled",
        title: "Fixture scheduled story",
        status: "published",
        publishedAt: days(2),
      },
      {
        ...storyBase,
        id: f.storyDraft,
        slug: "fixture-insight-draft-story",
        title: "Fixture draft story",
        status: "draft",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(editorialView)
      .where(inArray(editorialView.itemId, ids));
    await database.delete(guide).where(inArray(guide.id, ids));
    await database.delete(localStory).where(inArray(localStory.id, ids));
    await database.delete(place).where(inArray(place.id, ids));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const rowsFor = () =>
    getDatabase()
      .select()
      .from(editorialView)
      .where(inArray(editorialView.itemId, ids));

  it("counts views of public places, guides and stories only", async () => {
    expect(await recordEditorialView({ kind: "place", itemId: f.place })).toBe(
      true,
    );
    expect(
      await recordEditorialView({ kind: "guide", itemId: f.guideLive }),
    ).toBe(true);
    expect(
      await recordEditorialView({ kind: "story", itemId: f.storyLive }),
    ).toBe(true);
    // Not public, not the right kind, or not an item at all: never counted.
    for (const [kind, itemId] of [
      ["place", f.inactivePlace],
      ["guide", f.guideDraft],
      ["story", f.storyDraft],
      ["story", f.storyScheduled],
      ["guide", f.place],
      ["place", "00000000-0000-4000-8000-000000000999"],
    ] as const) {
      expect(await recordEditorialView({ kind, itemId })).toBe(false);
    }
    expect(await rowsFor()).toHaveLength(3);
  });

  it("counts a repeat open by the same visitor once, and another visitor separately", async () => {
    const now = new Date();
    const open = (visitorSignal: string, at: Date) =>
      recordEditorialView({
        kind: "guide",
        itemId: f.guideLive,
        visitorSignal,
        now: at,
      });
    expect(await open("203.0.113.1|a", now)).toBe(true);
    expect(await open("203.0.113.1|a", minutes(10))).toBe(false);
    expect(await open("203.0.113.2|b", now)).toBe(true);
    // After the window the same visitor counts again.
    expect(await open("203.0.113.1|a", minutes(45))).toBe(true);
    expect(await rowsFor()).toHaveLength(3);
  });

  it("serialises simultaneous beacons from one visitor into one count", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        recordEditorialView({
          kind: "place",
          itemId: f.place,
          visitorSignal: "203.0.113.9|burst",
        }),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("stores only a known source label and a one-way visitor hash", async () => {
    await recordEditorialView({
      kind: "place",
      itemId: f.place,
      source: "<script>alert(1)</script>",
      visitorSignal: "198.51.100.4|agent",
    });
    await recordEditorialView({
      kind: "guide",
      itemId: f.guideLive,
      source: "qr",
    });
    const rows = await rowsFor();
    expect(rows.map((row) => row.source).sort()).toEqual(["direct", "qr"]);
    const hashed = rows.find((row) => row.kind === "place");
    expect(hashed?.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows)).not.toContain("198.51.100.4");
  });

  it("ranks items, fills quiet days and lists public items nobody opened", async () => {
    const now = new Date();
    for (const visitor of ["a", "b", "c"]) {
      await recordEditorialView({
        kind: "guide",
        itemId: f.guideLive,
        visitorSignal: `v|${visitor}`,
        now: days(-2),
      });
    }
    await recordEditorialView({
      kind: "place",
      itemId: f.place,
      visitorSignal: "v|a",
      now: days(-40),
    });
    const insights = await getEditorialInsights(30, now);
    expect(insights).not.toBeNull();
    if (!insights) return;
    const guides = insights.groups.find((group) => group.kind === "guide");
    expect(
      guides?.rows.find((row) => row.itemId === f.guideLive),
    ).toMatchObject({
      title: "Fixture insight guide",
      views: 3,
      href: "/guides/fixture-insight-guide",
    });
    // The place view is 40 days old, outside a 30-day window.
    const places = insights.groups.find((group) => group.kind === "place");
    expect(places?.rows.some((row) => row.itemId === f.place)).toBe(false);
    expect(
      places?.unread.some((item) => item.itemId === f.place) ||
        (places?.unreadCount ?? 0) > 0,
    ).toBe(true);
    // The draft guide is never offered as "not opened".
    expect(guides?.unread.some((item) => item.itemId === f.guideDraft)).toBe(
      false,
    );
    expect(insights.daily).toHaveLength(30);
    expect(insights.daily.reduce((sum, point) => sum + point.views, 0)).toBe(
      insights.totalViews,
    );
    const wide = await getEditorialInsights(90, now);
    expect(
      wide?.groups
        .find((group) => group.kind === "place")
        ?.rows.some((row) => row.itemId === f.place),
    ).toBe(true);
  });

  it("counts exactly the London calendar days the chart shows", async () => {
    const now = new Date("2026-11-13T12:00:00Z");
    const open = (visitorSignal: string, at: Date) =>
      recordEditorialView({
        kind: "guide",
        itemId: f.guideLive,
        visitorSignal,
        now: at,
      });
    // 6 Nov 18:00 is before the 7-day window (7-13 Nov); 7 Nov 00:30 is in it.
    await open("w|a", new Date("2026-11-06T18:00:00Z"));
    await open("w|b", new Date("2026-11-07T00:30:00Z"));
    await open("w|c", new Date("2026-11-13T09:00:00Z"));
    const insights = await getEditorialInsights(7, now);
    const guides = insights?.groups.find((group) => group.kind === "guide");
    expect(guides?.rows.find((row) => row.itemId === f.guideLive)?.views).toBe(
      2,
    );
    expect(insights?.daily[0]).toEqual({ date: "2026-11-07", views: 1 });
    expect(insights?.daily.at(-1)?.date).toBe("2026-11-13");
    expect(insights?.daily.at(-1)?.views).toBeGreaterThanOrEqual(1);
    expect(insights?.daily.reduce((sum, p) => sum + p.views, 0)).toBe(
      insights?.totalViews,
    );
  });

  it("marks an item that stopped being public as not public", async () => {
    await recordEditorialView({
      kind: "story",
      itemId: f.storyLive,
      visitorSignal: "v|x",
    });
    await getDatabase()
      .update(localStory)
      .set({ status: "draft" })
      .where(eq(localStory.id, f.storyLive));
    const insights = await getEditorialInsights(7);
    const row = insights?.groups
      .find((group) => group.kind === "story")
      ?.rows.find((entry) => entry.itemId === f.storyLive);
    expect(row).toMatchObject({ views: 1, href: null });
  });

  it("removes views older than the retention period and keeps recent ones", async () => {
    const database = getDatabase();
    await database.insert(editorialView).values([
      { kind: "place", itemId: f.place, viewedAt: days(-500) },
      { kind: "place", itemId: f.place, viewedAt: days(-5) },
    ]);
    const result = await purgePlatformData(new Date());
    expect(result.failures).toEqual([]);
    expect(result.editorialViews).toBeGreaterThanOrEqual(1);
    const remaining = await rowsFor();
    expect(remaining).toHaveLength(1);
  });
});
