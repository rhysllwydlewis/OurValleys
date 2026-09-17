import { afterAll, describe, expect, it } from "vitest";
import { closeDatabase } from "@/lib/database/client";
import { listPublicEvents } from "@/modules/events/public";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  eventId: "00000000-0000-4000-8000-000000001201",
  categorySlug: "plumbing-heating",
  placeSlug: "tonypandy",
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
});
