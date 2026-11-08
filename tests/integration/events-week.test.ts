import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { businessEvent } from "@/lib/database/schema/business-operations";
import {
  findNextEventDay,
  listPublicEvents,
  listPublicEventsForWeek,
} from "@/modules/events/public";
import { londonDayKey } from "@/modules/events/date-window";
import { weekWindow } from "@/modules/events/week";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixtureId = "00000000-0000-4000-8000-000000001201";
const businessId = "00000000-0000-4000-8000-000000000401";
const laterId = "00000000-0000-4000-8000-00000000c001";
const cancelledId = "00000000-0000-4000-8000-00000000c002";

describeDatabase("public events for one week and the next date", () => {
  afterAll(async () => {
    const database = getDatabase();
    for (const id of [laterId, cancelledId]) {
      await database.delete(businessEvent).where(eq(businessEvent.id, id));
    }
    await closeDatabase();
  });

  it("lists an event in its own week and not in the neighbouring weeks", async () => {
    const database = getDatabase();
    await database.insert(businessEvent).values({
      id: laterId,
      businessId,
      title: "Fictional week-view market",
      description: "Fictional.",
      locationDisplay: "Fictional hall",
      startsAt: new Date("2099-09-16T10:00:00Z"), // a Wednesday
      endsAt: new Date("2099-09-16T14:00:00Z"),
      status: "active",
    });
    const inside = await listPublicEventsForWeek({ week: "2099-09-14" });
    const before = await listPublicEventsForWeek({ week: "2099-09-07" });
    const after = await listPublicEventsForWeek({ week: "2099-09-21" });
    expect(
      inside.state === "ready" && inside.events.map((e) => e.id),
    ).toContain(laterId);
    expect(
      before.state === "ready" && before.events.map((e) => e.id),
    ).not.toContain(laterId);
    expect(
      after.state === "ready" && after.events.map((e) => e.id),
    ).not.toContain(laterId);
  });

  it("normalises a mid-week day and rejects an invalid week", async () => {
    const midweek = await listPublicEventsForWeek({ week: "2099-09-17" });
    expect(midweek.state === "ready" && midweek.week).toBe("2099-09-14");
    for (const week of ["nonsense", "", "2099-02-31", "2099-09"]) {
      expect((await listPublicEventsForWeek({ week })).state).toBe(
        "unavailable",
      );
    }
  });

  it("never lists a cancelled event and honours the filters", async () => {
    const database = getDatabase();
    await database.insert(businessEvent).values({
      id: cancelledId,
      businessId,
      title: "Fictional cancelled stall",
      description: "Fictional.",
      locationDisplay: "Fictional hall",
      startsAt: new Date("2099-09-17T10:00:00Z"),
      endsAt: null,
      status: "cancelled",
    });
    const result = await listPublicEventsForWeek({ week: "2099-09-14" });
    expect(
      result.state === "ready" && result.events.map((e) => e.id),
    ).not.toContain(cancelledId);
    const wrongPlace = await listPublicEventsForWeek({
      week: "2099-09-14",
      place: "no-such-place",
    });
    expect(wrongPlace.state === "ready" && wrongPlace.events).toEqual([]);
  });

  it("finds the next day with events, and null when nothing is later", async () => {
    // Between the fixture (February 2099) and the market (16 September 2099).
    expect(await findNextEventDay({}, new Date("2099-03-01T00:00:00Z"))).toBe(
      "2099-09-16",
    );
    expect(
      await findNextEventDay({}, new Date("2100-01-01T00:00:00Z")),
    ).toBeNull();
    expect(
      await findNextEventDay(
        { place: "no-such-place" },
        new Date("2099-03-01T00:00:00Z"),
      ),
    ).toBeNull();
  });

  it("never points the jump at the past", async () => {
    const next = await findNextEventDay({}, new Date("2000-01-01T00:00:00Z"));
    expect(next === null || next >= londonDayKey(new Date())).toBe(true);
  });

  it("scopes the list to a window, as the period calendar feeds do", async () => {
    const window = weekWindow("2099-09-14");
    const result = await listPublicEvents({ window, pageSize: 50 });
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      const ids = result.events.map((event) => event.id);
      expect(ids).toContain(laterId);
      expect(ids).not.toContain(fixtureId);
    }
  });
});
