import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { listPublicEventsForMonth } from "@/modules/events/public";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixtureId = "00000000-0000-4000-8000-000000001201";
const businessId = "00000000-0000-4000-8000-000000000401";
const spanId = "00000000-0000-4000-8000-00000000b001";
const cancelledId = "00000000-0000-4000-8000-00000000b002";

describeDatabase("public events for one month", () => {
  afterAll(async () => {
    const database = getDatabase();
    await database.delete(businessEvent).where(eq(businessEvent.id, spanId));
    await database
      .delete(businessEvent)
      .where(eq(businessEvent.id, cancelledId));
    await closeDatabase();
  });

  it("lists the fixture event in its month and not in the next", async () => {
    const february = await listPublicEventsForMonth({ month: "2099-02" });
    expect(february.state).toBe("ready");
    if (february.state === "ready") {
      expect(february.events.map((event) => event.id)).toContain(fixtureId);
      expect(february.truncated).toBe(false);
    }
    const march = await listPublicEventsForMonth({ month: "2099-03" });
    expect(march.state).toBe("ready");
    if (march.state === "ready") {
      expect(march.events.map((event) => event.id)).not.toContain(fixtureId);
    }
  });

  it("finds an event that starts the month before and runs into this one", async () => {
    const database = getDatabase();
    await database.insert(businessEvent).values({
      id: spanId,
      businessId,
      title: "Fictional month-spanning festival",
      description: "Fictional.",
      locationDisplay: "Fictional hall",
      startsAt: new Date("2099-03-30T10:00:00Z"),
      endsAt: new Date("2099-04-02T10:00:00Z"),
      status: "active",
    });
    for (const month of ["2099-03", "2099-04"]) {
      const result = await listPublicEventsForMonth({ month });
      expect(result.state).toBe("ready");
      if (result.state === "ready") {
        expect(result.events.map((event) => event.id)).toContain(spanId);
      }
    }
    const may = await listPublicEventsForMonth({ month: "2099-05" });
    expect(may.state).toBe("ready");
    if (may.state === "ready") {
      expect(may.events.map((event) => event.id)).not.toContain(spanId);
    }
  });

  it("never lists a cancelled event", async () => {
    const database = getDatabase();
    await database.insert(businessEvent).values({
      id: cancelledId,
      businessId,
      title: "Fictional cancelled evening",
      description: "Fictional.",
      locationDisplay: "Fictional hall",
      startsAt: new Date("2099-06-10T18:00:00Z"),
      endsAt: null,
      status: "cancelled",
    });
    const result = await listPublicEventsForMonth({ month: "2099-06" });
    expect(result.state).toBe("ready");
    if (result.state === "ready") {
      expect(result.events.map((event) => event.id)).not.toContain(cancelledId);
    }
  });

  it("applies the category, place and search filters", async () => {
    const wrongPlace = await listPublicEventsForMonth({
      month: "2099-02",
      place: "treorchy",
    });
    const wrongCategory = await listPublicEventsForMonth({
      month: "2099-02",
      category: "no-such-category",
    });
    const rightPlace = await listPublicEventsForMonth({
      month: "2099-02",
      place: "tonypandy",
      query: "heating",
    });
    for (const result of [wrongPlace, wrongCategory]) {
      expect(result.state === "ready" && result.events).toEqual([]);
    }
    expect(
      rightPlace.state === "ready" && rightPlace.events.map((e) => e.id),
    ).toContain(fixtureId);
  });

  it("answers an invalid month as unavailable instead of guessing", async () => {
    for (const month of ["2099-13", "nonsense", "", "2099-02-14"]) {
      const result = await listPublicEventsForMonth({ month });
      expect(result.state).toBe("unavailable");
    }
  });
});
