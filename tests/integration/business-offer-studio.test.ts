import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { businessOffer } from "@/lib/database/schema/business-operations";
import {
  applyOfferQuickAction,
  listStudioOffers,
  saveStudioOffer,
} from "@/modules/businesses/offer-studio";
import { offerLimits } from "@/modules/businesses/offer-studio-model";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000002201",
  categoryId: "00000000-0000-4000-8000-000000002202",
  businessA: "00000000-0000-4000-8000-000000002203",
  businessB: "00000000-0000-4000-8000-000000002204",
} as const;

const day = 86_400_000;
const now = new Date();

function formOffer(overrides: Record<string, unknown> = {}) {
  return {
    title: "Autumn tune-up",
    description: "Book a tune-up before the cold arrives.",
    terms: null,
    actionUrl: null,
    actionLabel: null,
    startsAt: null,
    endsAt: null,
    status: "active" as const,
    ...overrides,
  };
}

async function insertOffer(
  businessId: string,
  values: Partial<typeof businessOffer.$inferInsert> = {},
) {
  const [row] = await getDatabase()
    .insert(businessOffer)
    .values({
      businessId,
      title: "Seeded offer",
      description: "A seeded offer for tests.",
      status: "active",
      ...values,
    })
    .returning({ id: businessOffer.id });
  return row!.id;
}

async function readOffer(offerId: string) {
  const [row] = await getDatabase()
    .select()
    .from(businessOffer)
    .where(eq(businessOffer.id, offerId));
  return row;
}

describeDatabase("offers studio storage", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.ownerId,
      name: "Offer Owner",
      email: "offer.owner@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Offer fixtures",
      slug: "offer-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [fixture.businessA, fixture.businessB].map((id, index) => ({
        id,
        tradingName: `Fixture Offer ${index === 0 ? "A" : "B"}`,
        slug: `fixture-offer-${index === 0 ? "a" : "b"}`,
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

  it("creates an offer and lists only this business's offers", async () => {
    await expect(
      saveStudioOffer({
        businessId: fixture.businessA,
        offer: formOffer({
          endsAt: new Date(now.getTime() + day).toISOString(),
        }),
      }),
    ).resolves.toBe("saved");
    await insertOffer(fixture.businessB, { title: "Other business offer" });

    const result = await listStudioOffers(fixture.businessA);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.offers.map((o) => o.title)).toEqual(["Autumn tune-up"]);
    expect(result.offers[0]).toMatchObject({ hasImage: false, image: null });
  });

  it("edits dates, terms and link that the old form could not change", async () => {
    const id = await insertOffer(fixture.businessA);
    const before = await readOffer(id);
    await expect(
      saveStudioOffer({
        businessId: fixture.businessA,
        offerId: id,
        expectedUpdatedAt: before!.updatedAt.getTime(),
        offer: formOffer({
          terms: "Weekdays only.",
          actionUrl: "https://example.test/book",
          actionLabel: "Book now",
          startsAt: new Date(now.getTime() + day).toISOString(),
          endsAt: new Date(now.getTime() + 8 * day).toISOString(),
        }),
      }),
    ).resolves.toBe("saved");
    const after = await readOffer(id);
    expect(after).toMatchObject({
      terms: "Weekdays only.",
      actionUrl: "https://example.test/book",
      actionLabel: "Book now",
    });
    expect(after!.startsAt).toBeInstanceOf(Date);
    expect(after!.endsAt).toBeInstanceOf(Date);
  });

  it("refuses to overwrite an offer saved since the form was built", async () => {
    const id = await insertOffer(fixture.businessA);
    const before = await readOffer(id);
    await expect(
      saveStudioOffer({
        businessId: fixture.businessA,
        offerId: id,
        expectedUpdatedAt: before!.updatedAt.getTime() - 5_000,
        offer: formOffer({ title: "Stale overwrite" }),
      }),
    ).resolves.toBe("stale");
    expect((await readOffer(id))!.title).toBe("Seeded offer");
  });

  it("cannot edit, act on or duplicate another business's offer", async () => {
    const otherId = await insertOffer(fixture.businessB, { title: "Theirs" });
    await expect(
      saveStudioOffer({
        businessId: fixture.businessA,
        offerId: otherId,
        offer: formOffer({ title: "Hijacked" }),
      }),
    ).resolves.toBe("not_found");
    for (const action of ["pause", "endNow", "duplicate", "publish"] as const) {
      await expect(
        applyOfferQuickAction({
          businessId: fixture.businessA,
          offerId: otherId,
          action,
        }),
      ).resolves.toBe("not_found");
    }
    const row = await readOffer(otherId);
    expect(row).toMatchObject({ title: "Theirs", status: "active" });
    expect(
      (await listStudioOffers(fixture.businessA)) as unknown,
    ).toMatchObject({ offers: [] });
  });

  it("stops at the offer limit for new offers and copies", async () => {
    await getDatabase()
      .insert(businessOffer)
      .values(
        Array.from({ length: offerLimits.maxOffers }, (_, index) => ({
          businessId: fixture.businessA,
          title: `Offer ${index}`,
          description: "Filler offer for the limit test.",
          status: "draft",
          sortOrder: 0,
        })),
      );
    await expect(
      saveStudioOffer({ businessId: fixture.businessA, offer: formOffer() }),
    ).resolves.toBe("limit");
    const listed = await listStudioOffers(fixture.businessA);
    if (listed.status !== "ok") throw new Error("unavailable");
    const first = listed.offers[0];
    await expect(
      applyOfferQuickAction({
        businessId: fixture.businessA,
        offerId: first!.id,
        action: "duplicate",
      }),
    ).resolves.toBe("limit");
  });

  it("publishes a draft, pauses and resumes a live offer", async () => {
    const id = await insertOffer(fixture.businessA, { status: "draft" });
    const run = (action: "publish" | "pause" | "resume") =>
      applyOfferQuickAction({
        businessId: fixture.businessA,
        offerId: id,
        action,
      });
    await expect(run("pause")).resolves.toBe("not_allowed");
    await expect(run("publish")).resolves.toBe("done");
    expect((await readOffer(id))!.status).toBe("active");
    await expect(run("publish")).resolves.toBe("not_allowed");
    await expect(run("pause")).resolves.toBe("done");
    expect((await readOffer(id))!.status).toBe("hidden");
    await expect(run("resume")).resolves.toBe("done");
    expect((await readOffer(id))!.status).toBe("active");
  });

  it("ends an offer now and then refuses everything but a copy", async () => {
    const id = await insertOffer(fixture.businessA);
    const later = new Date(now.getTime() + 60_000);
    await expect(
      applyOfferQuickAction({
        businessId: fixture.businessA,
        offerId: id,
        action: "endNow",
        now,
      }),
    ).resolves.toBe("done");
    // From a moment later the offer has ended.
    for (const action of ["pause", "extend", "endNow", "publish"] as const) {
      await expect(
        applyOfferQuickAction({
          businessId: fixture.businessA,
          offerId: id,
          action,
          days: 7,
          now: later,
        }),
      ).resolves.toBe("already_ended");
    }
    await expect(
      applyOfferQuickAction({
        businessId: fixture.businessA,
        offerId: id,
        action: "duplicate",
        now: later,
      }),
    ).resolves.toBe("done");
  });

  it("extends from the current end, and says so when there is no end", async () => {
    const end = new Date(now.getTime() + 2 * day);
    const id = await insertOffer(fixture.businessA, { endsAt: end });
    await expect(
      applyOfferQuickAction({
        businessId: fixture.businessA,
        offerId: id,
        action: "extend",
        days: 7,
        now,
      }),
    ).resolves.toBe("done");
    expect((await readOffer(id))!.endsAt!.getTime()).toBe(
      end.getTime() + 7 * day,
    );
    await expect(
      applyOfferQuickAction({
        businessId: fixture.businessA,
        offerId: id,
        action: "extend",
        days: 5,
        now,
      }),
    ).resolves.toBe("invalid");

    const openEnded = await insertOffer(fixture.businessA);
    await expect(
      applyOfferQuickAction({
        businessId: fixture.businessA,
        offerId: openEnded,
        action: "extend",
        days: 7,
        now,
      }),
    ).resolves.toBe("no_end");
  });

  it("copies an offer as an undated draft with the same wording", async () => {
    const id = await insertOffer(fixture.businessA, {
      title: "Spring sale",
      terms: "While stocks last.",
      actionUrl: "https://example.test/sale",
      actionLabel: "Shop",
      startsAt: new Date(now.getTime() - day),
      endsAt: new Date(now.getTime() + day),
    });
    await expect(
      applyOfferQuickAction({
        businessId: fixture.businessA,
        offerId: id,
        action: "duplicate",
        copySuffix: "(copi)",
      }),
    ).resolves.toBe("done");
    const result = await listStudioOffers(fixture.businessA);
    if (result.status !== "ok") throw new Error("unavailable");
    const copy = result.offers.find((o) => o.id !== id)!;
    expect(copy).toMatchObject({
      title: "Spring sale (copi)",
      terms: "While stocks last.",
      actionUrl: "https://example.test/sale",
      actionLabel: "Shop",
      status: "draft",
      startsAt: null,
      endsAt: null,
    });
  });

  it("rejects a picture that does not belong to this business", async () => {
    await expect(
      saveStudioOffer({
        businessId: fixture.businessA,
        offer: formOffer(),
        imageMediaId: "00000000-0000-4000-8000-0000000022ff",
      }),
    ).resolves.toBe("invalid");
  });
});
