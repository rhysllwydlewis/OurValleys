import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessPublication,
  businessSite,
  category,
} from "@/lib/database/schema/business";
import {
  businessEntitlement,
  businessLifecycle,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import {
  listBusinessOffers,
  saveBusinessOffer,
} from "@/modules/businesses/content-features";
import {
  listBusinessContactMethods,
  listBusinessEnquiries,
  saveBusinessContactMethod,
  submitBusinessEnquiry,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  changeBusinessLifecycle,
  getBusinessLifecycleView,
} from "@/modules/businesses/lifecycle-automation";
import {
  createBusinessTicket,
  resolveBusinessTicket,
} from "@/modules/businesses/tickets";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  ownerId: "00000000-0000-4000-8000-000000001901",
  adminId: "00000000-0000-4000-8000-000000001902",
  categoryId: "00000000-0000-4000-8000-000000001903",
  businessA: "00000000-0000-4000-8000-000000001904",
  businessB: "00000000-0000-4000-8000-000000001905",
  siteA: "00000000-0000-4000-8000-000000001906",
  publicationA: "00000000-0000-4000-8000-000000001907",
} as const;

const capabilities = [
  "website",
  "contacts",
  "enquiries",
  "offers",
  "events",
  "menu",
  "category_sections",
  "qr",
  "basic_analytics",
];

describeDatabase("business operations", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Operations Owner",
        email: "operations.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.adminId,
        name: "Operations Admin",
        email: "operations.admin@example.test",
        emailVerified: true,
        role: "platform_admin",
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Operations fixtures",
      slug: "operations-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values([
      {
        id: fixture.businessA,
        tradingName: "Fixture Operations A",
        slug: "fixture-operations-a",
        summary: "Fictional published business A.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "published",
        createdByUserId: fixture.ownerId,
      },
      {
        id: fixture.businessB,
        tradingName: "Fixture Operations B",
        slug: "fixture-operations-b",
        summary: "Fictional published business B.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "published",
        createdByUserId: fixture.ownerId,
      },
    ]);
    await database.insert(businessEntitlement).values([
      {
        businessId: fixture.businessA,
        planKey: "free",
        capabilities,
        limits: {},
      },
      {
        businessId: fixture.businessB,
        planKey: "free",
        capabilities,
        limits: {},
      },
    ]);
    await database.insert(businessSite).values({
      id: fixture.siteA,
      businessId: fixture.businessA,
      templateKey: "standard",
      platformPath: "/b/fixture-operations-a",
      status: "published",
      publishedAt: new Date(),
    });
    await database.insert(businessPublication).values({
      id: fixture.publicationA,
      businessId: fixture.businessA,
      businessSiteId: fixture.siteA,
      status: "published",
      publishedAt: new Date(),
    });
    await database.insert(businessLifecycle).values({
      businessId: fixture.businessA,
      state: "active",
      lastConfirmedAt: new Date(),
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessA));
    await database.delete(business).where(eq(business.id, fixture.businessB));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
    await database.delete(user).where(eq(user.id, fixture.adminId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("keeps configured contacts and enquiry inboxes inside the correct tenant", async () => {
    await expect(
      saveBusinessContactMethod({
        businessId: fixture.businessA,
        method: {
          type: "enquiry",
          label: "Send an enquiry",
          value: "form",
          enabled: true,
          isPrimary: true,
          sortOrder: 0,
        },
      }),
    ).resolves.toMatchObject({ status: "saved" });

    await expect(listBusinessContactMethods(fixture.businessA)).resolves.toHaveLength(1);
    await expect(listBusinessContactMethods(fixture.businessB)).resolves.toEqual([]);

    const input = {
      businessId: fixture.businessA,
      kind: "enquiry" as const,
      senderName: "Fictional Customer",
      senderEmail: "fictional.customer@example.test",
      senderPhone: "",
      message: "Please send fictional information about the demonstration service.",
      preferredTime: "Weekday afternoon",
      consentAccepted: true as const,
      website: "",
      visitorHash: "fixture-visitor-hash",
    };
    await expect(submitBusinessEnquiry(input)).resolves.toEqual({
      status: "submitted",
    });
    await expect(submitBusinessEnquiry(input)).resolves.toEqual({
      status: "duplicate",
    });
    await expect(listBusinessEnquiries(fixture.businessA)).resolves.toHaveLength(1);
    await expect(listBusinessEnquiries(fixture.businessB)).resolves.toEqual([]);
  });

  it("hides expired offers from the public projection", async () => {
    await expect(
      saveBusinessOffer({
        businessId: fixture.businessA,
        offer: {
          title: "Current fictional offer",
          description: "A current offer used only by automated tests.",
          status: "active",
          sortOrder: 0,
        },
      }),
    ).resolves.toBe("saved");
    await databaseInsertExpiredOffer();

    const publicOffers = await listBusinessOffers(fixture.businessA, true);
    expect(publicOffers.map((offer) => offer.title)).toEqual([
      "Current fictional offer",
    ]);
    expect(
      (await getDatabase()
        .select({ title: businessOffer.title })
        .from(businessOffer)
        .where(eq(businessOffer.businessId, fixture.businessA))).map(
        (offer) => offer.title,
      ),
    ).toEqual(expect.arrayContaining(["Current fictional offer", "Expired fictional offer"]));
  });

  it("applies an accepted correction atomically without changing another business", async () => {
    const ticket = await createBusinessTicket({
      businessId: fixture.businessA,
      reporterUserId: fixture.ownerId,
      reporterEmail: "operations.owner@example.test",
      type: "correction",
      reason: "The fictional public email should be corrected for this automated test.",
      evidence: {
        changes: { publicEmail: "corrected.operations@example.test" },
      },
      riskLevel: "standard",
    });
    expect(ticket.status).toBe("created");
    if (ticket.status !== "created") throw new Error("Ticket was not created");

    await expect(
      resolveBusinessTicket({
        adminUserId: fixture.adminId,
        ticketId: ticket.ticketId,
        action: "accept_correction",
        note: "Accepted after checking the fictional evidence.",
      }),
    ).resolves.toEqual({ status: "resolved" });

    const database = getDatabase();
    const [businessA] = await database
      .select({ email: business.publicEmail })
      .from(business)
      .where(eq(business.id, fixture.businessA));
    const [businessB] = await database
      .select({ email: business.publicEmail })
      .from(business)
      .where(eq(business.id, fixture.businessB));
    expect(businessA?.email).toBe("corrected.operations@example.test");
    expect(businessB?.email).toBeNull();
  });

  it("pauses and resumes a published site without deleting its content", async () => {
    await expect(
      changeBusinessLifecycle({
        businessId: fixture.businessA,
        actorUserId: fixture.ownerId,
        action: "pause",
      }),
    ).resolves.toBe("updated");
    await expect(getBusinessLifecycleView(fixture.businessA)).resolves.toMatchObject({
      state: "paused",
    });

    await expect(
      changeBusinessLifecycle({
        businessId: fixture.businessA,
        actorUserId: fixture.ownerId,
        action: "resume",
      }),
    ).resolves.toBe("updated");
    await expect(getBusinessLifecycleView(fixture.businessA)).resolves.toMatchObject({
      state: "active",
    });

    const [site] = await getDatabase()
      .select({ status: businessSite.status })
      .from(businessSite)
      .where(eq(businessSite.businessId, fixture.businessA));
    expect(site?.status).toBe("published");
  });
});

async function databaseInsertExpiredOffer() {
  await getDatabase().insert(businessOffer).values({
    businessId: fixture.businessA,
    title: "Expired fictional offer",
    description: "An expired offer retained privately for audit and editing.",
    status: "active",
    startsAt: new Date("2020-01-01T00:00:00.000Z"),
    endsAt: new Date("2020-01-02T00:00:00.000Z"),
    sortOrder: 1,
  });
}
