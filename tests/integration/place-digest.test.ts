import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessLocation,
  businessPublication,
  businessSite,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { savedPlace } from "@/lib/database/schema/saved-discovery";
import {
  applyUnsubscribe,
  createUnsubscribeToken,
} from "@/lib/notification-unsubscribe";
import { runPlaceDigest } from "@/modules/residents/place-digest";

const sent = vi.hoisted(() => [] as Array<{ to: string; text: string }>);
vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: async (message: { to: string; text: string }) => {
    sent.push(message);
  },
}));

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  optedInId: "00000000-0000-4000-8000-000000003101",
  optedOutId: "00000000-0000-4000-8000-000000003102",
  categoryId: "00000000-0000-4000-8000-000000003103",
  placeId: "00000000-0000-4000-8000-000000003104",
  otherPlaceId: "00000000-0000-4000-8000-000000003105",
  newBusinessId: "00000000-0000-4000-8000-000000003106",
  oldBusinessId: "00000000-0000-4000-8000-000000003107",
  elsewhereBusinessId: "00000000-0000-4000-8000-000000003108",
  eventId: "00000000-0000-4000-8000-000000003109",
} as const;

const now = new Date("2026-09-28T09:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

async function seedBusiness(input: {
  id: string;
  slug: string;
  name: string;
  placeId: string;
  createdAt: Date;
  publishedAt: Date;
}) {
  const database = getDatabase();
  await database.insert(business).values({
    id: input.id,
    tradingName: input.name,
    slug: input.slug,
    summary: "A fictional business for digest tests.",
    description: "Fictional.",
    primaryCategoryId: fixture.categoryId,
    businessType: "limited_company",
    status: "published",
    createdAt: input.createdAt,
  });
  await database.insert(businessLocation).values({
    businessId: input.id,
    placeId: input.placeId,
    locationType: "premises",
    isPrimary: true,
  });
  const [site] = await database
    .insert(businessSite)
    .values({
      businessId: input.id,
      templateKey: "universal",
      status: "published",
      platformPath: `/b/${input.slug}`,
      publishedAt: input.publishedAt,
    })
    .returning({ id: businessSite.id });
  await database.insert(businessPublication).values({
    businessId: input.id,
    businessSiteId: site!.id,
    status: "published",
    publishedAt: input.publishedAt,
  });
}

describeDatabase("saved-place digest", () => {
  beforeEach(async () => {
    sent.length = 0;
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.optedInId,
        name: "Digest Resident",
        email: "digest.in@example.test",
        emailVerified: true,
        savedPlaceDigestEmails: true,
      },
      {
        id: fixture.optedOutId,
        name: "Quiet Resident",
        email: "digest.out@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Digest fixture services",
      slug: "digest-fixture-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(place).values([
      {
        id: fixture.placeId,
        canonicalName: "Digestville",
        slug: "digestville-fixture",
        placeType: "town",
        editorialSummary: "Fictional.",
      },
      {
        id: fixture.otherPlaceId,
        canonicalName: "Elsewhere",
        slug: "elsewhere-fixture",
        placeType: "town",
        editorialSummary: "Fictional.",
      },
    ]);
    await database.insert(savedPlace).values([
      { userId: fixture.optedInId, placeId: fixture.placeId },
      { userId: fixture.optedOutId, placeId: fixture.placeId },
    ]);
    await seedBusiness({
      id: fixture.newBusinessId,
      slug: "digest-new-business",
      name: "Digest New Business",
      placeId: fixture.placeId,
      createdAt: daysAgo(3),
      publishedAt: daysAgo(2),
    });
    // Established business that merely republished: not "new".
    await seedBusiness({
      id: fixture.oldBusinessId,
      slug: "digest-old-business",
      name: "Digest Old Business",
      placeId: fixture.placeId,
      createdAt: daysAgo(200),
      publishedAt: daysAgo(1),
    });
    await seedBusiness({
      id: fixture.elsewhereBusinessId,
      slug: "digest-elsewhere-business",
      name: "Digest Elsewhere Business",
      placeId: fixture.otherPlaceId,
      createdAt: daysAgo(3),
      publishedAt: daysAgo(2),
    });
    await database.insert(businessEvent).values({
      id: fixture.eventId,
      businessId: fixture.oldBusinessId,
      title: "Digest Fixture Quiz",
      description: "Fictional event.",
      startsAt: new Date(now.getTime() + 3 * 86_400_000),
      status: "active",
      createdAt: daysAgo(1),
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const id of [
      fixture.newBusinessId,
      fixture.oldBusinessId,
      fixture.elsewhereBusinessId,
    ]) {
      await database.delete(business).where(eq(business.id, id));
    }
    await database.delete(place).where(eq(place.id, fixture.placeId));
    await database.delete(place).where(eq(place.id, fixture.otherPlaceId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.optedInId));
    await database.delete(user).where(eq(user.id, fixture.optedOutId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("emails only opted-in residents, with new businesses and events in their saved places", async () => {
    await runPlaceDigest(now);

    const mine = sent.filter(
      (message) => message.to === "digest.in@example.test",
    );
    expect(mine).toHaveLength(1);
    const text = mine[0]!.text;
    expect(text).toContain("Digest New Business");
    expect(text).toContain("Digest Fixture Quiz");
    // The old business is only named as the host of the new event, never
    // announced as a new business.
    expect(text).not.toContain("- Digest Old Business");
    expect(text).not.toContain("Digest Elsewhere Business");
    expect(text).toContain("/unsubscribe/saved_place_digest/");
    expect(
      sent.some((message) => message.to === "digest.out@example.test"),
    ).toBe(false);
  });

  it("does not send twice inside the minimum interval", async () => {
    await runPlaceDigest(now);
    sent.length = 0;
    await runPlaceDigest(new Date(now.getTime() + 86_400_000));
    expect(sent.filter((m) => m.to === "digest.in@example.test")).toHaveLength(
      0,
    );
  });

  it("does not mail or advance a recipient when nothing is new", async () => {
    await getDatabase()
      .update(user)
      .set({ savedPlaceDigestSentAt: daysAgo(6.5) })
      .where(eq(user.id, fixture.optedInId));
    await getDatabase()
      .delete(savedPlace)
      .where(eq(savedPlace.userId, fixture.optedInId));

    await runPlaceDigest(now);

    expect(sent.filter((m) => m.to === "digest.in@example.test")).toHaveLength(
      0,
    );
    const [row] = await getDatabase()
      .select({ at: user.savedPlaceDigestSentAt })
      .from(user)
      .where(eq(user.id, fixture.optedInId));
    expect(row?.at?.toISOString()).toBe(daysAgo(6.5).toISOString());
  });

  it("records the send time after delivery", async () => {
    await runPlaceDigest(now);
    const [row] = await getDatabase()
      .select({ at: user.savedPlaceDigestSentAt })
      .from(user)
      .where(eq(user.id, fixture.optedInId));
    expect(row?.at?.toISOString()).toBe(now.toISOString());
  });

  it("stops after the resident unsubscribes with a valid token", async () => {
    const token = createUnsubscribeToken(
      "saved_place_digest",
      fixture.optedInId,
    );
    expect(
      await applyUnsubscribe("saved_place_digest", fixture.optedInId, token),
    ).toBe("unsubscribed");
    await runPlaceDigest(now);
    expect(sent).toHaveLength(0);
  });

  it("rejects an unsubscribe with a token from another category", async () => {
    const token = createUnsubscribeToken(
      "saved_event_cancellation",
      fixture.optedInId,
    );
    expect(
      await applyUnsubscribe("saved_place_digest", fixture.optedInId, token),
    ).toBe("invalid");
  });
});
