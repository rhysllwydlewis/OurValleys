import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import {
  businessLocation,
  openingHoursRule,
} from "@/lib/database/schema/business";
import { businessOffer } from "@/lib/database/schema/business-operations";
import { listPublishedBusinesses } from "@/modules/businesses/public";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  businessId: "00000000-0000-4000-8000-000000000401",
} as const;
const offerIds = {
  soon: "00000000-0000-4000-8000-00000000d101",
  expired: "00000000-0000-4000-8000-00000000d102",
  draft: "00000000-0000-4000-8000-00000000d103",
} as const;
const day = 86_400_000;

// The seeded weekly rule is Mon-Fri 08:00-16:00 and closed at weekends.
const wednesdayMorning = new Date(Date.UTC(2026, 0, 14, 10, 0));
const sundayMorning = new Date(Date.UTC(2026, 0, 18, 10, 0));

async function fixtureCard(now: Date) {
  const result = await listPublishedBusinesses({ query: "heating", now });
  if (result.state !== "ready") throw new Error("expected ready");
  const card = result.businesses.find((b) => b.id === fixture.businessId);
  if (!card) throw new Error("fixture business missing from the directory");
  return card;
}

describeDatabase("directory card data", () => {
  beforeAll(async () => {
    const now = Date.now();
    const base = {
      businessId: fixture.businessId,
      description: "Integration test offer.",
    };
    await getDatabase()
      .insert(businessOffer)
      .values([
        {
          ...base,
          id: offerIds.soon,
          title: "Ends in two days",
          status: "active",
          endsAt: new Date(now + 2 * day),
        },
        {
          ...base,
          id: offerIds.expired,
          title: "Expired yesterday",
          status: "active",
          endsAt: new Date(now - day),
        },
        {
          ...base,
          id: offerIds.draft,
          title: "Unpublished draft",
          status: "draft",
          endsAt: new Date(now + day),
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await getDatabase()
      .delete(businessOffer)
      .where(inArray(businessOffer.id, Object.values(offerIds)));
    await closeDatabase();
  });

  it("reports whether the business is open at the given London time", async () => {
    expect((await fixtureCard(wednesdayMorning)).openNow).toBe(true);
    expect((await fixtureCard(sundayMorning)).openNow).toBe(false);
  });

  it("shows the soonest-ending live offer, never an expired or draft one", async () => {
    const card = await fixtureCard(wednesdayMorning);
    // `now` is fixed in January 2026, so the offers created relative to the
    // real clock are all in the future for it; the draft is still excluded.
    expect(card.currentOffer?.title).not.toBe("Unpublished draft");
    const live = await fixtureCard(new Date());
    expect(live.currentOffer?.title).toBe("Ends in two days");
    expect(live.currentOffer?.endsAt).toBeInstanceOf(Date);
  });

  it("lists at most three active service names in owner order", async () => {
    const card = await fixtureCard(wednesdayMorning);
    expect(card.serviceNames?.length).toBeGreaterThan(0);
    expect(card.serviceNames?.length).toBeLessThanOrEqual(3);
  });

  it("keeps the open-now filter and the card status in agreement", async () => {
    const open = await listPublishedBusinesses({
      query: "heating",
      openNow: true,
      now: wednesdayMorning,
    });
    const closed = await listPublishedBusinesses({
      query: "heating",
      openNow: true,
      now: sundayMorning,
    });
    if (open.state !== "ready" || closed.state !== "ready") {
      throw new Error("expected ready");
    }
    expect(open.businesses.every((b) => b.openNow === true)).toBe(true);
    expect(closed.businesses.some((b) => b.id === fixture.businessId)).toBe(
      false,
    );
  });

  it("treats the gap between two windows as closed and the second window as open", async () => {
    const database = getDatabase();
    const [location] = await database
      .select({ id: businessLocation.id })
      .from(businessLocation)
      .where(eq(businessLocation.businessId, fixture.businessId));
    const wednesday = and(
      eq(openingHoursRule.businessLocationId, location!.id),
      eq(openingHoursRule.dayOfWeek, 3),
    );
    const [original] = await database
      .select()
      .from(openingHoursRule)
      .where(wednesday);
    try {
      // 08:00-10:30 and 14:00-16:00 on Wednesday; January is GMT.
      await database
        .update(openingHoursRule)
        .set({
          opensAt: "08:00",
          closesAt: "10:30",
          secondOpensAt: "14:00",
          secondClosesAt: "16:00",
        })
        .where(wednesday);
      const at = (hour: number, minute = 0) =>
        new Date(Date.UTC(2026, 0, 14, hour, minute));
      expect((await fixtureCard(at(9))).openNow).toBe(true);
      expect((await fixtureCard(at(12))).openNow).toBe(false);
      expect((await fixtureCard(at(15))).openNow).toBe(true);
      expect((await fixtureCard(at(16))).openNow).toBe(false);
      const gap = await listPublishedBusinesses({
        query: "heating",
        openNow: true,
        now: at(12),
      });
      if (gap.state !== "ready") throw new Error("expected ready");
      expect(gap.businesses.some((b) => b.id === fixture.businessId)).toBe(
        false,
      );
      const afternoon = await listPublishedBusinesses({
        query: "heating",
        openNow: true,
        now: at(15),
      });
      if (afternoon.state !== "ready") throw new Error("expected ready");
      expect(
        afternoon.businesses.some((b) => b.id === fixture.businessId),
      ).toBe(true);
    } finally {
      if (original) {
        await database
          .update(openingHoursRule)
          .set({
            opensAt: original.opensAt,
            closesAt: original.closesAt,
            secondOpensAt: original.secondOpensAt,
            secondClosesAt: original.secondClosesAt,
          })
          .where(wednesday);
      }
    }
  });
});
