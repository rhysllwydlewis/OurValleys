import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import {
  businessActivityEvent,
  businessEvent,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import {
  getContentPerformance,
  recordContentView,
} from "@/modules/businesses/content-insights";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const id = (n: number) => `00000000-0000-4000-8000-0000000009${n}`;
const f = {
  category: id(71),
  business: id(72),
  otherBusiness: id(73),
  draftBusiness: id(74),
  demoBusiness: id(75),
  offerLive: id(76),
  offerDraft: id(77),
  eventLive: id(78),
  otherOffer: id(79),
  demoOffer: id(80),
} as const;

const days = (n: number) => new Date(Date.now() + n * 86_400_000);

describeDatabase("content views and performance", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: f.category,
      name: "Fixture content insights",
      slug: "fixture-content-insights",
      description: "Fictional category used only by automated tests.",
    });
    const base = {
      summary: "A fictional business used only by tests.",
      description: "Fictional description.",
      primaryCategoryId: f.category,
      businessType: "limited_company" as const,
    };
    await database.insert(business).values([
      {
        ...base,
        id: f.business,
        tradingName: "Fixture A",
        slug: "content-a",
        status: "published",
      },
      {
        ...base,
        id: f.otherBusiness,
        tradingName: "Fixture B",
        slug: "content-b",
        status: "published",
      },
      {
        ...base,
        id: f.draftBusiness,
        tradingName: "Fixture C",
        slug: "content-c",
        status: "draft",
      },
      {
        ...base,
        id: f.demoBusiness,
        tradingName: "Fixture D",
        slug: "content-d",
        status: "published",
        isDemo: true,
      },
    ]);
    const offer = (offerId: string, businessId: string, status: string) => ({
      id: offerId,
      businessId,
      title: `Offer ${offerId.slice(-2)}`,
      description: "Fictional offer.",
      status,
    });
    await database
      .insert(businessOffer)
      .values([
        offer(f.offerLive, f.business, "active"),
        offer(f.offerDraft, f.business, "draft"),
        offer(f.otherOffer, f.draftBusiness, "active"),
        offer(f.demoOffer, f.demoBusiness, "active"),
      ]);
    await database.insert(businessEvent).values({
      id: f.eventLive,
      businessId: f.business,
      title: "Fixture event",
      description: "Fictional event.",
      startsAt: days(3),
      status: "active",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    const ids = [f.business, f.otherBusiness, f.draftBusiness, f.demoBusiness];
    await database
      .delete(businessActivityEvent)
      .where(inArray(businessActivityEvent.businessId, ids));
    await database.delete(business).where(inArray(business.id, ids));
    await database.delete(category).where(eq(category.id, f.category));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("credits a view to the business that owns the item, from the item alone", async () => {
    expect(
      await recordContentView({
        kind: "offer",
        itemId: f.offerLive,
        visitorSignal: "198.51.100.7|test",
      }),
    ).toBe(true);
    const rows = await getDatabase()
      .select()
      .from(businessActivityEvent)
      .where(eq(businessActivityEvent.businessId, f.business));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      eventType: "offer_view",
      metadata: { itemId: f.offerLive },
    });
    expect(rows[0]?.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows[0])).not.toContain("198.51.100.7");
  });

  it("ignores items that are not publicly visible, unknown, of another kind or demonstration", async () => {
    expect(
      await recordContentView({ kind: "offer", itemId: f.offerDraft }),
    ).toBe(false);
    expect(
      await recordContentView({ kind: "offer", itemId: f.otherOffer }),
    ).toBe(false);
    expect(
      await recordContentView({ kind: "offer", itemId: f.demoOffer }),
    ).toBe(false);
    expect(await recordContentView({ kind: "offer", itemId: id(99) })).toBe(
      false,
    );
    // An event id presented as an offer must not resolve.
    expect(
      await recordContentView({ kind: "offer", itemId: f.eventLive }),
    ).toBe(false);
    expect(
      await getDatabase().select().from(businessActivityEvent),
    ).toHaveLength(0);
  });

  it("reports views per item for the period and never mixes businesses", async () => {
    await recordContentView({ kind: "offer", itemId: f.offerLive });
    await recordContentView({ kind: "offer", itemId: f.offerLive });
    await recordContentView({ kind: "event", itemId: f.eventLive });
    await getDatabase()
      .insert(businessActivityEvent)
      .values({
        businessId: f.business,
        eventType: "offer_view",
        metadata: { itemId: f.offerLive },
        occurredAt: new Date(Date.now() - 40 * 86_400_000),
      });

    const groups = await getContentPerformance(f.business, 30);
    expect(groups).not.toBeNull();
    const offers = groups!.find((g) => g.kind === "offer")!;
    const events = groups!.find((g) => g.kind === "event")!;
    expect(offers.rows).toHaveLength(1); // the draft offer is not listed
    expect(offers.rows[0]).toMatchObject({
      itemId: f.offerLive,
      views: 2,
      saves: 0,
    });
    expect(events.rows[0]).toMatchObject({ itemId: f.eventLive, views: 1 });

    const other = await getContentPerformance(f.otherBusiness, 30);
    expect(other!.every((g) => g.rows.length === 0)).toBe(true);
    const wide = await getContentPerformance(f.business, 90);
    expect(wide!.find((g) => g.kind === "offer")!.rows[0]?.views).toBe(3);
  });
});
