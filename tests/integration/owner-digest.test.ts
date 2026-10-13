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
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import {
  businessActivityEvent,
  businessLifecycle,
} from "@/lib/database/schema/business-operations";
import {
  applyUnsubscribe,
  createUnsubscribeToken,
} from "@/lib/notification-unsubscribe";
import {
  configureWeeklyDigest,
  runOwnerDigest,
} from "@/modules/businesses/owner-digest";

const sent = vi.hoisted(() => [] as Array<{ to: string; text: string }>);
vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: async (message: { to: string; text: string }) => {
    sent.push(message);
  },
}));

const describeDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000004101",
  businessId: "00000000-0000-4000-8000-000000004102",
  quietBusinessId: "00000000-0000-4000-8000-000000004103",
  ownerId: "00000000-0000-4000-8000-000000004104",
  managerId: "00000000-0000-4000-8000-000000004105",
  otherOwnerId: "00000000-0000-4000-8000-000000004106",
} as const;

const now = new Date("2026-10-12T08:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describeDatabase("owner weekly digest", () => {
  beforeEach(async () => {
    sent.length = 0;
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Digest Owner",
        email: "digest.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.managerId,
        name: "Digest Manager",
        email: "digest.manager@example.test",
        emailVerified: true,
      },
      {
        id: fixture.otherOwnerId,
        name: "Other Owner",
        email: "digest.other@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Owner digest fixtures",
      slug: "owner-digest-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    for (const [id, slug] of [
      [fixture.businessId, "owner-digest-business"],
      [fixture.quietBusinessId, "owner-digest-quiet-business"],
    ] as const) {
      await database.insert(business).values({
        id,
        tradingName: `Fixture ${slug}`,
        slug,
        summary: "A fictional business for digest tests.",
        description: "Fictional.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "published",
      });
    }
    await database.insert(businessMembership).values([
      {
        businessId: fixture.businessId,
        userId: fixture.ownerId,
        role: "owner",
        permissions: [],
        status: "active",
      },
      {
        businessId: fixture.businessId,
        userId: fixture.managerId,
        role: "manager",
        permissions: [],
        status: "active",
      },
      {
        businessId: fixture.quietBusinessId,
        userId: fixture.otherOwnerId,
        role: "owner",
        permissions: [],
        status: "active",
      },
    ]);
    await database.insert(businessActivityEvent).values([
      {
        businessId: fixture.businessId,
        eventType: "website_view",
        occurredAt: daysAgo(2),
      },
      {
        businessId: fixture.businessId,
        eventType: "website_view",
        occurredAt: daysAgo(3),
      },
      {
        businessId: fixture.businessId,
        eventType: "call_click",
        occurredAt: daysAgo(1),
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const id of [fixture.businessId, fixture.quietBusinessId]) {
      await database.delete(business).where(eq(business.id, id));
    }
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    for (const id of [
      fixture.ownerId,
      fixture.managerId,
      fixture.otherOwnerId,
    ]) {
      await database.delete(user).where(eq(user.id, id));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("sends nothing while the digest is off, which is the default", async () => {
    const result = await runOwnerDigest(now);
    expect(result.businesses).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("emails only the active owners of an opted-in business, once a week", async () => {
    await configureWeeklyDigest({
      businessId: fixture.businessId,
      enabled: true,
    });
    const first = await runOwnerDigest(now);
    expect(first).toMatchObject({ businesses: 1, sent: 1, failed: 0 });
    expect(sent.map((message) => message.to)).toEqual([
      "digest.owner@example.test",
    ]);
    expect(sent[0]!.text).toContain("Page views: 2");
    expect(sent[0]!.text).toContain("contact taps: 1");
    expect(sent[0]!.text).toContain("/unsubscribe/business_digest/");

    sent.length = 0;
    const again = await runOwnerDigest(new Date(now.getTime() + 86_400_000));
    expect(again.businesses).toBe(0);
    expect(sent).toHaveLength(0);

    const nextWeek = await runOwnerDigest(
      new Date(now.getTime() + 7 * 86_400_000),
    );
    expect(nextWeek.businesses).toBe(1);
  });

  it("skips a business with nothing to report without advancing it", async () => {
    await configureWeeklyDigest({
      businessId: fixture.quietBusinessId,
      enabled: true,
    });
    const result = await runOwnerDigest(now);
    expect(result).toMatchObject({ businesses: 1, sent: 0, skippedEmpty: 1 });
    const [row] = await getDatabase()
      .select({ sentAt: businessLifecycle.weeklyDigestSentAt })
      .from(businessLifecycle)
      .where(eq(businessLifecycle.businessId, fixture.quietBusinessId));
    expect(row?.sentAt).toBeNull();
  });

  it("stops after the owner's unsubscribe link, and rejects a non-owner's", async () => {
    await configureWeeklyDigest({
      businessId: fixture.businessId,
      enabled: true,
    });
    const managerSubject = `${fixture.businessId}.${fixture.managerId}`;
    expect(
      await applyUnsubscribe(
        "business_digest",
        managerSubject,
        createUnsubscribeToken("business_digest", managerSubject),
      ),
    ).toBe("invalid");

    const ownerSubject = `${fixture.businessId}.${fixture.ownerId}`;
    expect(
      await applyUnsubscribe(
        "business_digest",
        ownerSubject,
        createUnsubscribeToken("business_digest", ownerSubject),
      ),
    ).toBe("unsubscribed");
    const result = await runOwnerDigest(now);
    expect(result.businesses).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("does not turn the digest off through a business-reminder token", async () => {
    await configureWeeklyDigest({
      businessId: fixture.businessId,
      enabled: true,
    });
    const subject = `${fixture.businessId}.${fixture.ownerId}`;
    await applyUnsubscribe(
      "business_lifecycle",
      subject,
      createUnsubscribeToken("business_lifecycle", subject),
    );
    const result = await runOwnerDigest(now);
    expect(result.businesses).toBe(1);
  });
});
