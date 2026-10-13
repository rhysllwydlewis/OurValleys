import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import {
  businessActivityEvent,
  businessContactMethod,
  businessEnquiry,
  businessLifecycle,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import { loadOwnerHubData } from "@/modules/businesses/owner-hub-data";
import { buildOwnerNextSteps } from "@/modules/businesses/owner-hub";

const describeDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000004201",
  businessId: "00000000-0000-4000-8000-000000004202",
  otherBusinessId: "00000000-0000-4000-8000-000000004203",
} as const;

const now = new Date("2026-10-13T09:00:00.000Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describeDatabase("owner hub data", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Owner hub fixtures",
      slug: "owner-hub-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    for (const [id, slug] of [
      [fixture.businessId, "owner-hub-business"],
      [fixture.otherBusinessId, "owner-hub-other-business"],
    ] as const) {
      await database.insert(business).values({
        id,
        tradingName: `Fixture ${slug}`,
        slug,
        summary: "A fictional business for owner hub tests.",
        description: "Fictional.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "published",
      });
    }
  });

  afterEach(async () => {
    const database = getDatabase();
    for (const id of [fixture.businessId, fixture.otherBusinessId]) {
      await database.delete(business).where(eq(business.id, id));
    }
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("reports an empty business honestly", async () => {
    const data = await loadOwnerHubData(fixture.businessId, now);
    expect(data.facts).toEqual({
      enquiriesWaiting: 0,
      oldestEnquiryWaitDays: 0,
      contactMethodCount: 0,
      hasLogo: false,
      galleryCount: 0,
      activeOfferCount: 0,
      upcomingEventCount: 0,
      weeklyDigestEnabled: false,
    });
    expect(data.analytics?.summary.totalViews).toBe(0);
    expect(data.analytics?.daily.length).toBeGreaterThan(0);
  });

  it("counts only new and read enquiries of this business and the oldest wait", async () => {
    const database = getDatabase();
    const base = {
      senderName: "Fictional Sender",
      message: "A fictional enquiry.",
      consentAccepted: true,
    };
    await database.insert(businessEnquiry).values([
      {
        ...base,
        businessId: fixture.businessId,
        status: "new",
        dedupeKey: "hub-1",
        submittedAt: daysAgo(5),
      },
      {
        ...base,
        businessId: fixture.businessId,
        status: "read",
        dedupeKey: "hub-2",
        submittedAt: daysAgo(1),
      },
      {
        ...base,
        businessId: fixture.businessId,
        status: "replied",
        dedupeKey: "hub-3",
        submittedAt: daysAgo(20),
      },
      {
        ...base,
        businessId: fixture.otherBusinessId,
        status: "new",
        dedupeKey: "hub-4",
        submittedAt: daysAgo(30),
      },
    ]);
    const data = await loadOwnerHubData(fixture.businessId, now);
    expect(data.facts.enquiriesWaiting).toBe(2);
    expect(data.facts.oldestEnquiryWaitDays).toBe(5);
    const steps = buildOwnerNextSteps({
      ...data.facts,
      status: "published",
      canEdit: true,
      canPublish: true,
      canOperate: true,
      canDesign: true,
      setupKnown: true,
      missingSetupSteps: [],
    });
    expect(steps[0]).toMatchObject({
      id: "reply_enquiries",
      tone: "urgent",
      count: 2,
    });
  });

  it("counts live offers, the digest switch and this business's activity only", async () => {
    const database = getDatabase();
    await database.insert(businessOffer).values([
      {
        businessId: fixture.businessId,
        title: "Live offer",
        description: "Fictional.",
        status: "active",
      },
      {
        businessId: fixture.businessId,
        title: "Draft offer",
        description: "Fictional.",
        status: "draft",
      },
      {
        businessId: fixture.otherBusinessId,
        title: "Other offer",
        description: "Fictional.",
        status: "active",
      },
    ]);
    await database
      .insert(businessLifecycle)
      .values({ businessId: fixture.businessId, weeklyDigestEnabled: true });
    await database.insert(businessActivityEvent).values([
      {
        businessId: fixture.businessId,
        eventType: "website_view",
        occurredAt: new Date(),
      },
      {
        businessId: fixture.otherBusinessId,
        eventType: "website_view",
        occurredAt: new Date(),
      },
    ]);
    const data = await loadOwnerHubData(fixture.businessId);
    expect(data.facts.activeOfferCount).toBe(1);
    expect(data.facts.weeklyDigestEnabled).toBe(true);
    expect(data.analytics?.summary.totalViews).toBe(1);
  });

  it("reads no analytics when the caller may not see them", async () => {
    await getDatabase().insert(businessActivityEvent).values({
      businessId: fixture.businessId,
      eventType: "website_view",
      occurredAt: new Date(),
    });
    const data = await loadOwnerHubData(fixture.businessId, new Date(), {
      includeAnalytics: false,
    });
    expect(data.analytics).toBeNull();
  });

  it("does not count disabled contact methods", async () => {
    await getDatabase()
      .insert(businessContactMethod)
      .values([
        {
          businessId: fixture.businessId,
          type: "call",
          label: "Phone",
          value: "01000 000000",
          enabled: false,
        },
      ]);
    const data = await loadOwnerHubData(fixture.businessId, now);
    expect(data.facts.contactMethodCount).toBe(0);
  });

  it("returns empty facts rather than throwing for an unknown business", async () => {
    const data = await loadOwnerHubData("00000000-0000-4000-8000-0000000042ff");
    expect(data.facts.enquiriesWaiting).toBe(0);
    expect(data.facts.activeOfferCount).toBe(0);
  });
});
