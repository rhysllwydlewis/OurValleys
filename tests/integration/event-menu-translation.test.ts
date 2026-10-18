import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import {
  businessEvent,
  businessMenuGroup,
  businessMenuItem,
  eventTranslation,
  menuGroupTranslation,
  menuItemTranslation,
} from "@/lib/database/schema/business-operations";
import { getPublicEvent, listPublicEvents } from "@/modules/events/public";
import {
  readWelshContent,
  saveBusinessTranslation,
} from "@/modules/businesses/translations";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

// The seeded published fixture business (cwm-coil-heating).
const seeded = "00000000-0000-4000-8000-000000000401";
const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000971",
  otherBusinessId: "00000000-0000-4000-8000-000000000972",
  otherEventId: "00000000-0000-4000-8000-000000000973",
  otherGroupId: "00000000-0000-4000-8000-000000000974",
  otherItemId: "00000000-0000-4000-8000-000000000975",
  oneOffId: "00000000-0000-4000-8000-000000000976",
  groupId: "00000000-0000-4000-8000-000000000977",
  itemId: "00000000-0000-4000-8000-000000000978",
  seriesId: "00000000-0000-4000-8000-000000000979",
} as const;
const seriesDates = [
  "00000000-0000-4000-8000-000000000981",
  "00000000-0000-4000-8000-000000000982",
  "00000000-0000-4000-8000-000000000983",
];

const day = 24 * 60 * 60 * 1000;
const soon = (days: number) => new Date(Date.now() + days * day);

async function clear() {
  const database = getDatabase();
  await database
    .delete(businessEvent)
    .where(
      inArray(businessEvent.id, [
        fixture.oneOffId,
        fixture.otherEventId,
        ...seriesDates,
      ]),
    );
  await database
    .delete(businessMenuGroup)
    .where(
      inArray(businessMenuGroup.id, [fixture.groupId, fixture.otherGroupId]),
    );
}

describeDatabase("event and menu translation", () => {
  beforeEach(async () => {
    await clear();
    const database = getDatabase();
    await database
      .insert(category)
      .values({
        id: fixture.categoryId,
        name: "Fixture event translation services",
        slug: "fixture-event-translation-services",
        description: "Fictional category used only by automated tests.",
      })
      .onConflictDoNothing();
    await database
      .insert(business)
      .values({
        id: fixture.otherBusinessId,
        tradingName: "Fixture other event translator",
        slug: "fixture-other-event-translator",
        summary: "A fictional business used only by translation tests.",
        description: "Fictional description.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company",
      })
      .onConflictDoNothing();
    await database.insert(businessEvent).values([
      {
        id: fixture.oneOffId,
        businessId: seeded,
        title: "Harvest supper",
        description: "A long table of local food.",
        startsAt: soon(5),
        status: "active",
      },
      ...seriesDates.map((id, index) => ({
        id,
        businessId: seeded,
        title: "Tuesday quiz",
        description: "Teams of up to six.",
        startsAt: soon(2 + index * 7),
        status: "active",
        seriesId: fixture.seriesId,
      })),
      {
        id: fixture.otherEventId,
        businessId: fixture.otherBusinessId,
        title: "Other business event",
        description: "Not ours.",
        startsAt: soon(3),
        status: "active",
      },
    ]);
    await database.insert(businessMenuGroup).values([
      { id: fixture.groupId, businessId: seeded, name: "Mains" },
      {
        id: fixture.otherGroupId,
        businessId: fixture.otherBusinessId,
        name: "Other mains",
      },
    ]);
    await database.insert(businessMenuItem).values([
      {
        id: fixture.itemId,
        businessId: seeded,
        groupId: fixture.groupId,
        name: "Stew",
        description: "Slow cooked",
        priceDisplay: "£9",
      },
      {
        id: fixture.otherItemId,
        businessId: fixture.otherBusinessId,
        groupId: fixture.otherGroupId,
        name: "Other stew",
      },
    ]);
  });

  afterEach(async () => {
    await clear();
    const database = getDatabase();
    await database
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const actorUserId = randomUUID();
  const save = (
    value: Parameters<typeof saveBusinessTranslation>[0]["value"],
  ) => saveBusinessTranslation({ businessId: seeded, actorUserId, value });
  const base = { summary: null, description: null, services: {} };

  it("offers one entry per repeating series, earliest date first", async () => {
    const content = await readWelshContent(seeded);
    const ids = content.events.map((event) => event.id);
    expect(ids).toContain(fixture.oneOffId);
    expect(ids).toContain(seriesDates[0]);
    expect(ids).not.toContain(seriesDates[1]);
    expect(ids).not.toContain(fixture.otherEventId);
    expect(content.events.find((e) => e.id === seriesDates[0])?.dates).toBe(3);
    const group = content.menuGroups.find((g) => g.id === fixture.groupId);
    expect(group?.items.map((item) => item.id)).toEqual([fixture.itemId]);
    expect(content.menuGroups.map((g) => g.id)).not.toContain(
      fixture.otherGroupId,
    );
  });

  it("writes a series' Welsh to every date and shows it to Welsh readers only", async () => {
    expect(
      await save({
        ...base,
        events: {
          [seriesDates[0]!]: { title: "Cwis nos Fawrth", description: null },
        },
      }),
    ).toEqual({ status: "saved" });
    const rows = await getDatabase()
      .select()
      .from(eventTranslation)
      .where(inArray(eventTranslation.eventId, seriesDates));
    expect(rows).toHaveLength(3);

    const welsh = await getPublicEvent(seriesDates[2]!, "cy");
    expect(welsh).toMatchObject({
      state: "found",
      event: {
        title: "Cwis nos Fawrth",
        description: "Teams of up to six.",
        welshTitle: true,
        welshDescription: false,
      },
    });
    const english = await getPublicEvent(seriesDates[2]!, "en");
    expect(english).toMatchObject({
      state: "found",
      event: { title: "Tuesday quiz", welshTitle: false },
    });
    const unspecified = await getPublicEvent(seriesDates[2]!);
    expect(unspecified).toMatchObject({
      event: { title: "Tuesday quiz" },
    });

    // Clearing the anchor clears the whole series.
    await save({
      ...base,
      events: { [seriesDates[0]!]: { title: null, description: null } },
    });
    expect(
      await getDatabase()
        .select()
        .from(eventTranslation)
        .where(inArray(eventTranslation.eventId, seriesDates)),
    ).toHaveLength(0);
  });

  it("searches Welsh event text for any reader and lists it in Welsh for Welsh readers", async () => {
    await save({
      ...base,
      events: {
        [fixture.oneOffId]: { title: "Swper cynhaeaf", description: null },
      },
    });
    const found = await listPublicEvents({ query: "cynhaeaf", locale: "cy" });
    expect(found.state).toBe("ready");
    const match = found.events.find((e) => e.id === fixture.oneOffId);
    expect(match).toMatchObject({ title: "Swper cynhaeaf", welshTitle: true });
    const english = await listPublicEvents({ query: "cynhaeaf", locale: "en" });
    expect(english.events.find((e) => e.id === fixture.oneOffId)?.title).toBe(
      "Harvest supper",
    );
  });

  it("never writes into another business's events or menu (tenant isolation)", async () => {
    await save({
      ...base,
      events: {
        [fixture.otherEventId]: { title: "Ymosodiad", description: null },
      },
      menuGroups: {
        [fixture.otherGroupId]: { name: "Ymosodiad", description: null },
      },
      menuItems: {
        [fixture.otherItemId]: { name: "Ymosodiad", description: null },
      },
    });
    const database = getDatabase();
    expect(
      await database
        .select()
        .from(eventTranslation)
        .where(eq(eventTranslation.eventId, fixture.otherEventId)),
    ).toHaveLength(0);
    expect(
      await database
        .select()
        .from(menuGroupTranslation)
        .where(eq(menuGroupTranslation.groupId, fixture.otherGroupId)),
    ).toHaveLength(0);
    expect(
      await database
        .select()
        .from(menuItemTranslation)
        .where(eq(menuItemTranslation.itemId, fixture.otherItemId)),
    ).toHaveLength(0);
  });

  it("does not read the Welsh of events that are over", async () => {
    await save({
      ...base,
      events: {
        [fixture.oneOffId]: { title: "Swper cynhaeaf", description: null },
      },
    });
    await getDatabase()
      .update(businessEvent)
      .set({ startsAt: soon(-10), endsAt: soon(-9) })
      .where(eq(businessEvent.id, fixture.oneOffId));
    const content = await readWelshContent(seeded);
    expect(content.translation.events[fixture.oneOffId]).toBeUndefined();
    expect(content.events.map((event) => event.id)).not.toContain(
      fixture.oneOffId,
    );
  });

  it("saves, reads back and clears menu text; leaving the menu out leaves it alone", async () => {
    await save({
      ...base,
      menuGroups: {
        [fixture.groupId]: { name: "Prif brydau", description: null },
      },
      menuItems: {
        [fixture.itemId]: {
          name: "Cawl",
          description: "Wedi’i goginio’n araf",
        },
      },
    });
    let content = await readWelshContent(seeded);
    expect(content.translation.menuGroups[fixture.groupId]).toEqual({
      name: "Prif brydau",
      description: null,
    });
    expect(content.translation.menuItems[fixture.itemId]).toEqual({
      name: "Cawl",
      description: "Wedi’i goginio’n araf",
    });

    // A save that offers no events or menu keeps what is there.
    await save({ ...base, summary: "Crynodeb" });
    content = await readWelshContent(seeded);
    expect(content.translation.menuItems[fixture.itemId]?.name).toBe("Cawl");

    await save({
      ...base,
      menuItems: { [fixture.itemId]: { name: null, description: null } },
    });
    content = await readWelshContent(seeded);
    expect(content.translation.menuItems[fixture.itemId]).toBeUndefined();
    expect(content.translation.menuGroups[fixture.groupId]?.name).toBe(
      "Prif brydau",
    );
  });

  it("rolls the whole save back when one menu field breaks a database limit", async () => {
    const result = await save({
      ...base,
      summary: "Dylai gael ei ddadwneud",
      menuItems: {
        [fixture.itemId]: { name: "n".repeat(121), description: null },
      },
    });
    expect(result).toEqual({ status: "unavailable" });
    const content = await readWelshContent(seeded);
    expect(content.translation.summary).toBeNull();
    expect(content.translation.menuItems[fixture.itemId]).toBeUndefined();
  });

  it("removes Welsh text with the event, section and item", async () => {
    await save({
      ...base,
      events: {
        [fixture.oneOffId]: { title: "Swper cynhaeaf", description: null },
      },
      menuGroups: { [fixture.groupId]: { name: "Prif", description: null } },
      menuItems: { [fixture.itemId]: { name: "Cawl", description: null } },
    });
    const database = getDatabase();
    await database
      .delete(businessEvent)
      .where(eq(businessEvent.id, fixture.oneOffId));
    await database
      .delete(businessMenuGroup)
      .where(eq(businessMenuGroup.id, fixture.groupId));
    expect(
      await database
        .select()
        .from(eventTranslation)
        .where(eq(eventTranslation.eventId, fixture.oneOffId)),
    ).toHaveLength(0);
    expect(
      await database
        .select()
        .from(menuGroupTranslation)
        .where(eq(menuGroupTranslation.groupId, fixture.groupId)),
    ).toHaveLength(0);
    // The item went with its section.
    expect(
      await database
        .select()
        .from(menuItemTranslation)
        .where(eq(menuItemTranslation.itemId, fixture.itemId)),
    ).toHaveLength(0);
  });
});
