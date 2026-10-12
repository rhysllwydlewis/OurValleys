import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase } from "@/lib/database/client";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { listEventDayCounts, listPublicEvents } from "@/modules/events/public";
import { londonDayKey, londonDayKeyAfter } from "@/modules/events/date-window";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  eventId: "00000000-0000-4000-8000-000000001201",
  categorySlug: "plumbing-heating",
  placeSlug: "tonypandy",
  titleWord: "heating",
} as const;

describeDatabase("public event discovery", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("lists the fixture event with no filters applied", async () => {
    const result = await listPublicEvents();

    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.events.map((event) => event.id)).toContain(fixture.eventId);
    expect(result.page).toBe(1);
    expect(result.hasPreviousPage).toBe(false);
  });

  it("finds the fixture event through its category and place filters", async () => {
    const byCategory = await listPublicEvents({
      category: fixture.categorySlug,
    });
    const byPlace = await listPublicEvents({ place: fixture.placeSlug });

    expect(byCategory.state).toBe("ready");
    if (byCategory.state === "ready") {
      expect(byCategory.events.map((event) => event.id)).toContain(
        fixture.eventId,
      );
    }

    expect(byPlace.state).toBe("ready");
    if (byPlace.state === "ready") {
      expect(byPlace.events.map((event) => event.id)).toContain(
        fixture.eventId,
      );
    }
  });

  it("excludes the fixture event when a different category or place is requested", async () => {
    const wrongCategory = await listPublicEvents({
      category: "no-such-category",
    });
    const wrongPlace = await listPublicEvents({ place: "treorchy" });

    expect(wrongCategory.state).toBe("ready");
    if (wrongCategory.state === "ready") {
      expect(wrongCategory.total).toBe(0);
      expect(wrongCategory.events).toEqual([]);
    }

    expect(wrongPlace.state).toBe("ready");
    if (wrongPlace.state === "ready") {
      expect(wrongPlace.events.map((event) => event.id)).not.toContain(
        fixture.eventId,
      );
    }
  });

  it("finds the fixture event through a free-text search term", async () => {
    const result = await listPublicEvents({ query: fixture.titleWord });

    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.events.map((event) => event.id)).toContain(fixture.eventId);
  });

  it("excludes the fixture event when the search term does not match", async () => {
    const result = await listPublicEvents({ query: "no-such-search-term" });

    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.events.map((event) => event.id)).not.toContain(
      fixture.eventId,
    );
  });

  it("recovers an out-of-range page to the first available page", async () => {
    const result = await listPublicEvents({
      category: fixture.categorySlug,
      page: 999_999,
    });

    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.page).toBe(1);
    expect(result.events.map((event) => event.id)).toContain(fixture.eventId);
  });

  it("applies the date quick filter without breaking other filters", async () => {
    const week = await listPublicEvents({ when: "week" });
    const none = await listPublicEvents({
      when: "today",
      place: "no-such-place",
    });

    expect(week.state).toBe("ready");
    expect(none.state).toBe("ready");
    if (week.state === "ready") {
      const horizon = Date.now() + 8 * 86_400_000;
      for (const event of week.events) {
        expect(event.startsAt.getTime()).toBeLessThan(horizon);
      }
    }
    if (none.state === "ready") expect(none.total).toBe(0);
  });

  it("narrows to one London day, and not to the days either side", async () => {
    const onDay = await listPublicEvents({ day: "2099-02-14" });
    const before = await listPublicEvents({ day: "2099-02-13" });
    const after = await listPublicEvents({ day: "2099-02-15" });
    expect(onDay.state).toBe("ready");
    if (onDay.state === "ready") {
      expect(onDay.events.map((event) => event.id)).toContain(fixture.eventId);
    }
    for (const result of [before, after]) {
      expect(result.state).toBe("ready");
      if (result.state === "ready") {
        expect(result.events.map((event) => event.id)).not.toContain(
          fixture.eventId,
        );
      }
    }
  });

  it("lets a picked day win over a quick range and ignores an invalid day", async () => {
    const dayWins = await listPublicEvents({
      day: "2099-02-14",
      when: "today",
    });
    expect(dayWins.state === "ready" && dayWins.total).toBeGreaterThan(0);
    const invalid = await listPublicEvents({ day: "2099-02-30" });
    const none = await listPublicEvents();
    expect(invalid.state === "ready" && invalid.total).toBe(
      none.state === "ready" && none.total,
    );
  });

  it("keeps the thirty-day range from reaching far-future events", async () => {
    const month = await listPublicEvents({ when: "month" });
    expect(month.state).toBe("ready");
    if (month.state === "ready") {
      expect(month.events.map((event) => event.id)).not.toContain(
        fixture.eventId,
      );
    }
  });

  it("counts events on the fourteen-day strip under the visitor's other filters", async () => {
    const database = getDatabase();
    const [donor] = await database
      .select({ businessId: businessEvent.businessId })
      .from(businessEvent)
      .where(eq(businessEvent.id, fixture.eventId));
    if (!donor) throw new Error("fixture event missing");
    const now = new Date();
    const startsAt = new Date(now.getTime() + 3 * 86_400_000);
    const [created] = await database
      .insert(businessEvent)
      .values({
        businessId: donor.businessId,
        title: "Strip count test event",
        description: "Temporary event for the day strip test.",
        startsAt,
        status: "active",
      })
      .returning({ id: businessEvent.id });
    try {
      const counts = await listEventDayCounts({}, now);
      expect(counts).toHaveLength(14);
      expect(counts?.[0]?.dayKey).toBe(londonDayKey(now));
      expect(counts?.[13]?.dayKey).toBe(londonDayKeyAfter(now, 13));
      expect(
        counts?.find((entry) => entry.dayKey === londonDayKey(startsAt))?.count,
      ).toBeGreaterThanOrEqual(1);

      const elsewhere = await listEventDayCounts(
        { place: "no-such-place" },
        now,
      );
      expect(elsewhere?.reduce((sum, entry) => sum + entry.count, 0)).toBe(0);
    } finally {
      if (created) {
        await database
          .delete(businessEvent)
          .where(eq(businessEvent.id, created.id));
      }
    }
  });
});
