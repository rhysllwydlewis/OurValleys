import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import {
  applyEventQuickAction,
  checkEventCurrent,
  listStudioEvents,
  saveStudioEvent,
} from "@/modules/businesses/event-studio";
import { eventLimits } from "@/modules/businesses/event-studio-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000002301",
  categoryId: "00000000-0000-4000-8000-000000002302",
  businessA: "00000000-0000-4000-8000-000000002303",
  businessB: "00000000-0000-4000-8000-000000002304",
} as const;

const day = 86_400_000;
const now = new Date();

function formEvent(overrides: Record<string, unknown> = {}) {
  return {
    title: "Quiz night",
    description: "A friendly quiz in the village hall.",
    locationDisplay: null,
    bookingUrl: null,
    startsAt: new Date(now.getTime() + 3 * day).toISOString(),
    endsAt: null,
    status: "active" as const,
    repeat: null,
    applyToSeries: false,
    ...overrides,
  };
}

async function insertEvent(
  businessId: string,
  values: Partial<typeof businessEvent.$inferInsert> = {},
) {
  const [row] = await getDatabase()
    .insert(businessEvent)
    .values({
      businessId,
      title: "Seeded event",
      description: "A seeded event for tests.",
      startsAt: new Date(now.getTime() + 2 * day),
      status: "active",
      ...values,
    })
    .returning({ id: businessEvent.id });
  return row!.id;
}

async function readEvent(eventId: string) {
  const [row] = await getDatabase()
    .select()
    .from(businessEvent)
    .where(eq(businessEvent.id, eventId));
  return row;
}

describeDatabase("events studio storage", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.ownerId,
      name: "Event Owner",
      email: "event.owner@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Event fixtures",
      slug: "event-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [fixture.businessA, fixture.businessB].map((id, index) => ({
        id,
        tradingName: `Fixture Event ${index === 0 ? "A" : "B"}`,
        slug: `fixture-event-${index === 0 ? "a" : "b"}`,
        summary: "Fictional business.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area" as const,
        status: "published" as const,
        createdByUserId: fixture.ownerId,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessA));
    await database.delete(business).where(eq(business.id, fixture.businessB));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("creates an event and lists only this business's events", async () => {
    await expect(
      saveStudioEvent({
        businessId: fixture.businessA,
        event: formEvent({ locationDisplay: "Village hall" }),
      }),
    ).resolves.toBe("saved");
    await insertEvent(fixture.businessB, { title: "Other business event" });

    const result = await listStudioEvents(fixture.businessA);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.events.map((e) => e.title)).toEqual(["Quiz night"]);
    expect(result.events[0]).toMatchObject({
      locationDisplay: "Village hall",
      seriesId: null,
      hasImage: false,
    });
  });

  it("creates a repeating event as one series of separate dates", async () => {
    await expect(
      saveStudioEvent({
        businessId: fixture.businessA,
        event: formEvent({ repeat: { frequency: "weekly", occurrences: 4 } }),
      }),
    ).resolves.toBe("saved");
    const result = await listStudioEvents(fixture.businessA);
    if (result.status !== "ok") throw new Error("unavailable");
    expect(result.events).toHaveLength(4);
    expect(new Set(result.events.map((e) => e.seriesId)).size).toBe(1);
    expect(result.events[0]!.seriesId).not.toBeNull();
  });

  it("edits one date, or the wording of the other upcoming dates too", async () => {
    await saveStudioEvent({
      businessId: fixture.businessA,
      event: formEvent({ repeat: { frequency: "weekly", occurrences: 3 } }),
    });
    const before = await listStudioEvents(fixture.businessA);
    if (before.status !== "ok") throw new Error("unavailable");
    const [first, second, third] = before.events;
    // The third date was already cancelled and must stay that way.
    await getDatabase()
      .update(businessEvent)
      .set({ status: "cancelled" })
      .where(eq(businessEvent.id, third!.id));

    await expect(
      saveStudioEvent({
        businessId: fixture.businessA,
        eventId: first!.id,
        expectedUpdatedAt: first!.updatedAt.getTime(),
        event: formEvent({
          title: "Big quiz",
          locationDisplay: "Hall",
          startsAt: first!.startsAt.toISOString(),
          applyToSeries: false,
        }),
      }),
    ).resolves.toBe("saved");
    expect((await readEvent(second!.id))!.title).toBe("Quiz night");

    const fresh = await readEvent(first!.id);
    await expect(
      saveStudioEvent({
        businessId: fixture.businessA,
        eventId: first!.id,
        expectedUpdatedAt: fresh!.updatedAt.getTime(),
        event: formEvent({
          title: "Grand quiz",
          startsAt: first!.startsAt.toISOString(),
          applyToSeries: true,
        }),
      }),
    ).resolves.toBe("saved");
    expect((await readEvent(second!.id))!.title).toBe("Grand quiz");
    // Dates and status of the other dates are untouched, and so is a cancelled one.
    expect((await readEvent(second!.id))!.startsAt).toEqual(second!.startsAt);
    expect((await readEvent(third!.id))!.title).toBe("Quiz night");
  });

  it("refuses to overwrite an event saved since the form was built", async () => {
    const id = await insertEvent(fixture.businessA);
    const before = await readEvent(id);
    await expect(
      saveStudioEvent({
        businessId: fixture.businessA,
        eventId: id,
        expectedUpdatedAt: before!.updatedAt.getTime() - 5_000,
        event: formEvent({ title: "Stale overwrite" }),
      }),
    ).resolves.toBe("stale");
    expect((await readEvent(id))!.title).toBe("Seeded event");
    await expect(
      checkEventCurrent({
        businessId: fixture.businessA,
        eventId: id,
        expectedUpdatedAt: before!.updatedAt.getTime() - 5_000,
      }),
    ).resolves.toEqual({ result: "stale" });
  });

  it("cannot edit, act on or duplicate another business's event", async () => {
    const otherId = await insertEvent(fixture.businessB, { title: "Theirs" });
    await expect(
      saveStudioEvent({
        businessId: fixture.businessA,
        eventId: otherId,
        event: formEvent({ title: "Hijacked" }),
      }),
    ).resolves.toBe("not_found");
    for (const action of ["pause", "cancel", "duplicate", "publish"] as const) {
      await expect(
        applyEventQuickAction({
          businessId: fixture.businessA,
          eventId: otherId,
          action,
        }),
      ).resolves.toBe("not_found");
    }
    expect(await readEvent(otherId)).toMatchObject({
      title: "Theirs",
      status: "active",
    });
    await expect(
      checkEventCurrent({
        businessId: fixture.businessA,
        eventId: otherId,
        expectedUpdatedAt: undefined,
      }),
    ).resolves.toEqual({ result: "not_found" });
    expect(
      (await listStudioEvents(fixture.businessA)) as unknown,
    ).toMatchObject({ events: [] });
  });

  it("keeps administrator takedowns out of reach and counts them", async () => {
    const id = await insertEvent(fixture.businessA, { status: "removed" });
    await expect(
      saveStudioEvent({
        businessId: fixture.businessA,
        eventId: id,
        event: formEvent({ title: "Back from the dead" }),
      }),
    ).resolves.toBe("locked");
    for (const action of [
      "publish",
      "resume",
      "reopen",
      "duplicate",
    ] as const) {
      await expect(
        applyEventQuickAction({
          businessId: fixture.businessA,
          eventId: id,
          action,
        }),
      ).resolves.toBe("locked");
    }
    expect((await readEvent(id))!.status).toBe("removed");
    const result = await listStudioEvents(fixture.businessA);
    if (result.status !== "ok") throw new Error("unavailable");
    expect(result.events).toEqual([]);
    expect(result.takenDown).toBe(1);
  });

  it("stops at the event limit for new events, series and copies", async () => {
    await getDatabase()
      .insert(businessEvent)
      .values(
        Array.from({ length: eventLimits.maxEvents - 2 }, (_, index) => ({
          businessId: fixture.businessA,
          title: `Filler ${index}`,
          description: "Filler event for the limit test.",
          startsAt: new Date(now.getTime() + (index + 1) * day),
          status: "draft",
        })),
      );
    // Two free places: a three-date series does not fit, a single event does.
    await expect(
      saveStudioEvent({
        businessId: fixture.businessA,
        event: formEvent({ repeat: { frequency: "weekly", occurrences: 3 } }),
      }),
    ).resolves.toBe("limit");
    await expect(
      saveStudioEvent({ businessId: fixture.businessA, event: formEvent() }),
    ).resolves.toBe("saved");
    const [anyEvent] = await getDatabase()
      .select({ id: businessEvent.id })
      .from(businessEvent)
      .where(eq(businessEvent.title, "Filler 0"));
    await expect(
      applyEventQuickAction({
        businessId: fixture.businessA,
        eventId: anyEvent!.id,
        action: "duplicate",
      }),
    ).resolves.toBe("done");
    await expect(
      applyEventQuickAction({
        businessId: fixture.businessA,
        eventId: anyEvent!.id,
        action: "duplicate",
      }),
    ).resolves.toBe("limit");
  });

  it("runs the quick actions against the stored row", async () => {
    const id = await insertEvent(fixture.businessA, { status: "draft" });
    const act = (
      action: Parameters<typeof applyEventQuickAction>[0]["action"],
      extra: { days?: number } = {},
    ) =>
      applyEventQuickAction({
        businessId: fixture.businessA,
        eventId: id,
        action,
        ...extra,
      });

    await expect(act("pause")).resolves.toBe("not_allowed");
    await expect(act("publish")).resolves.toBe("done");
    expect((await readEvent(id))!.status).toBe("active");
    await expect(act("publish")).resolves.toBe("not_allowed");

    const start = (await readEvent(id))!.startsAt;
    await expect(act("postpone", { days: 3 })).resolves.toBe("invalid");
    await expect(act("postpone", { days: 7 })).resolves.toBe("done");
    expect((await readEvent(id))!.startsAt.getTime()).toBeGreaterThan(
      start.getTime() + 6 * day,
    );

    await expect(act("pause")).resolves.toBe("done");
    expect((await readEvent(id))!.status).toBe("hidden");
    await expect(act("resume")).resolves.toBe("done");
    await expect(act("cancel")).resolves.toBe("done");
    expect((await readEvent(id))!.status).toBe("cancelled");
    await expect(act("cancel")).resolves.toBe("not_allowed");
    await expect(act("reopen")).resolves.toBe("done");
    expect((await readEvent(id))!.status).toBe("draft");
  });

  it("does not publish an event whose date has passed, or bring a past one back", async () => {
    const past = await insertEvent(fixture.businessA, {
      status: "draft",
      startsAt: new Date(now.getTime() - 3 * day),
    });
    await expect(
      applyEventQuickAction({
        businessId: fixture.businessA,
        eventId: past,
        action: "publish",
      }),
    ).resolves.toBe("already_over");
    expect((await readEvent(past))!.status).toBe("draft");

    const finished = await insertEvent(fixture.businessA, {
      startsAt: new Date(now.getTime() - 3 * day),
    });
    await expect(
      applyEventQuickAction({
        businessId: fixture.businessA,
        eventId: finished,
        action: "postpone",
        days: 7,
      }),
    ).resolves.toBe("already_over");
  });

  it("copies an event as an unpublished draft on a future date", async () => {
    const id = await insertEvent(fixture.businessA, {
      startsAt: new Date(now.getTime() - 20 * day),
      endsAt: new Date(now.getTime() - 20 * day + 2 * 3_600_000),
      locationDisplay: "Hall",
    });
    await expect(
      applyEventQuickAction({
        businessId: fixture.businessA,
        eventId: id,
        action: "duplicate",
        copySuffix: "(copy)",
      }),
    ).resolves.toBe("done");
    const result = await listStudioEvents(fixture.businessA);
    if (result.status !== "ok") throw new Error("unavailable");
    const copy = result.events.find((e) => e.title === "Seeded event (copy)");
    expect(copy).toMatchObject({
      status: "draft",
      locationDisplay: "Hall",
      seriesId: null,
    });
    expect(copy!.startsAt.getTime()).toBeGreaterThan(now.getTime());
    expect(copy!.endsAt!.getTime() - copy!.startsAt.getTime()).toBe(
      2 * 3_600_000,
    );
  });
});
