import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  businessPublication,
  businessSite,
  category,
} from "@/lib/database/schema/business";
import {
  listBusinessEvents,
  saveBusinessEvent,
} from "@/modules/businesses/content-features";
import {
  listBusinessContactMethods,
  saveBusinessContactMethod,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  createBusinessTicket,
  resolveBusinessTicket,
} from "@/modules/businesses/tickets";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002101",
  primaryBusinessId: "00000000-0000-4000-8000-000000002102",
  duplicateBusinessId: "00000000-0000-4000-8000-000000002103",
  primarySiteId: "00000000-0000-4000-8000-000000002104",
  duplicateSiteId: "00000000-0000-4000-8000-000000002105",
  primaryPublicationId: "00000000-0000-4000-8000-000000002106",
  duplicatePublicationId: "00000000-0000-4000-8000-000000002107",
  primaryOwnerId: "00000000-0000-4000-8000-000000002108",
  duplicateOwnerId: "00000000-0000-4000-8000-000000002109",
  duplicateEditorId: "00000000-0000-4000-8000-000000002110",
  duplicateViewerId: "00000000-0000-4000-8000-000000002111",
  adminId: "00000000-0000-4000-8000-000000002112",
  missingContactId: "00000000-0000-4000-8000-000000002113",
} as const;

const userIds = [
  fixture.primaryOwnerId,
  fixture.duplicateOwnerId,
  fixture.duplicateEditorId,
  fixture.duplicateViewerId,
  fixture.adminId,
];

describeDatabase("business operations safety", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.primaryOwnerId,
        name: "Primary Owner",
        email: "primary.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.duplicateOwnerId,
        name: "Duplicate Owner",
        email: "duplicate.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.duplicateEditorId,
        name: "Duplicate Editor",
        email: "duplicate.editor@example.test",
        emailVerified: true,
      },
      {
        id: fixture.duplicateViewerId,
        name: "Duplicate Viewer",
        email: "duplicate.viewer@example.test",
        emailVerified: true,
      },
      {
        id: fixture.adminId,
        name: "Operations Admin",
        email: "operations.safety.admin@example.test",
        emailVerified: true,
        role: "platform_admin",
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Operations safety fixtures",
      slug: "operations-safety-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values([
      {
        id: fixture.primaryBusinessId,
        tradingName: "Primary Safety Fixture",
        slug: "primary-safety-fixture",
        summary: "Fictional primary business.",
        description: "Fictional primary business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "published",
        createdByUserId: fixture.primaryOwnerId,
      },
      {
        id: fixture.duplicateBusinessId,
        tradingName: "Duplicate Safety Fixture",
        slug: "duplicate-safety-fixture",
        summary: "Fictional duplicate business.",
        description: "Fictional duplicate business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "published",
        createdByUserId: fixture.duplicateOwnerId,
      },
    ]);
    await database.insert(businessSite).values([
      {
        id: fixture.primarySiteId,
        businessId: fixture.primaryBusinessId,
        templateKey: "standard",
        status: "published",
        platformPath: "/b/primary-safety-fixture",
        publishedAt: new Date(),
      },
      {
        id: fixture.duplicateSiteId,
        businessId: fixture.duplicateBusinessId,
        templateKey: "standard",
        status: "published",
        platformPath: "/b/duplicate-safety-fixture",
        publishedAt: new Date(),
      },
    ]);
    await database.insert(businessPublication).values([
      {
        id: fixture.primaryPublicationId,
        businessId: fixture.primaryBusinessId,
        businessSiteId: fixture.primarySiteId,
        status: "published",
        publishedAt: new Date(),
      },
      {
        id: fixture.duplicatePublicationId,
        businessId: fixture.duplicateBusinessId,
        businessSiteId: fixture.duplicateSiteId,
        status: "published",
        publishedAt: new Date(),
      },
    ]);
    await database.insert(businessMembership).values([
      {
        businessId: fixture.primaryBusinessId,
        userId: fixture.primaryOwnerId,
        role: "owner",
        permissions: permissionsForBusinessRole("owner"),
        status: "active",
      },
      {
        businessId: fixture.duplicateBusinessId,
        userId: fixture.duplicateOwnerId,
        role: "owner",
        permissions: permissionsForBusinessRole("owner"),
        status: "active",
      },
      {
        businessId: fixture.duplicateBusinessId,
        userId: fixture.duplicateEditorId,
        role: "editor",
        permissions: permissionsForBusinessRole("editor"),
        status: "active",
      },
      {
        businessId: fixture.duplicateBusinessId,
        userId: fixture.duplicateViewerId,
        role: "viewer",
        permissions: permissionsForBusinessRole("viewer"),
        status: "active",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(business)
      .where(eq(business.id, fixture.primaryBusinessId));
    await database
      .delete(business)
      .where(eq(business.id, fixture.duplicateBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    for (const userId of userIds) {
      await database.delete(user).where(eq(user.id, userId));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("does not clear the existing primary contact for missing or disabled replacements", async () => {
    const primary = await saveBusinessContactMethod({
      businessId: fixture.primaryBusinessId,
      method: {
        type: "email",
        label: "Primary email",
        value: "primary@example.test",
        enabled: true,
        isPrimary: true,
        sortOrder: 0,
      },
    });
    expect(primary.status).toBe("saved");

    await expect(
      saveBusinessContactMethod({
        businessId: fixture.primaryBusinessId,
        method: {
          id: fixture.missingContactId,
          type: "call",
          label: "Missing contact",
          value: "+44 1443 123456",
          enabled: true,
          isPrimary: true,
          sortOrder: 1,
        },
      }),
    ).resolves.toEqual({ status: "not_found" });

    await expect(
      saveBusinessContactMethod({
        businessId: fixture.primaryBusinessId,
        method: {
          type: "call",
          label: "Disabled contact",
          value: "+44 1443 654321",
          enabled: false,
          isPrimary: true,
          sortOrder: 2,
        },
      }),
    ).resolves.toMatchObject({ status: "saved" });

    const methods = await listBusinessContactMethods(fixture.primaryBusinessId);
    expect(methods.find((method) => method.label === "Primary email")).toMatchObject(
      { enabled: true, isPrimary: true },
    );
    expect(methods.find((method) => method.label === "Disabled contact")).toMatchObject(
      { enabled: false, isPrimary: false },
    );
  });

  it("expires one-off events without an end time after their start time", async () => {
    await saveBusinessEvent({
      businessId: fixture.primaryBusinessId,
      event: {
        title: "Past one-off event",
        description: "A past fictional event without an end time.",
        startsAt: "2020-01-01T12:00:00.000Z",
        status: "active",
      },
    });
    await saveBusinessEvent({
      businessId: fixture.primaryBusinessId,
      event: {
        title: "Future one-off event",
        description: "A future fictional event without an end time.",
        startsAt: "2099-01-01T12:00:00.000Z",
        status: "active",
      },
    });

    const events = await listBusinessEvents(fixture.primaryBusinessId, true);
    expect(events.map((event) => event.title)).toEqual(["Future one-off event"]);
  });

  it("rejects mismatched ticket actions and unstructured corrections", async () => {
    const ticket = await createBusinessTicket({
      businessId: fixture.primaryBusinessId,
      reporterEmail: "reporter@example.test",
      type: "correction",
      reason: "The public details may need a correction.",
      evidence: { reportReason: "incorrect_details" },
      riskLevel: "standard",
    });
    expect(ticket.status).toBe("created");
    if (ticket.status !== "created") throw new Error("Ticket was not created");

    await expect(
      resolveBusinessTicket({
        adminUserId: fixture.adminId,
        ticketId: ticket.ticketId,
        action: "merge_duplicate",
        note: "This action must not be allowed for a correction.",
      }),
    ).resolves.toMatchObject({ status: "invalid" });
    await expect(
      resolveBusinessTicket({
        adminUserId: fixture.adminId,
        ticketId: ticket.ticketId,
        action: "accept_correction",
        note: "There is no structured change to apply.",
      }),
    ).resolves.toMatchObject({ status: "invalid" });
  });

  it("merges and restores duplicate memberships and publication state safely", async () => {
    const ticket = await createBusinessTicket({
      businessId: fixture.primaryBusinessId,
      relatedBusinessId: fixture.duplicateBusinessId,
      reporterEmail: "reporter@example.test",
      type: "duplicate",
      reason: "These fictional records represent the same test business.",
      riskLevel: "high",
    });
    expect(ticket.status).toBe("created");
    if (ticket.status !== "created") throw new Error("Ticket was not created");

    await expect(
      resolveBusinessTicket({
        adminUserId: fixture.adminId,
        ticketId: ticket.ticketId,
        action: "merge_duplicate",
        note: "Merged after checking both fictional records.",
      }),
    ).resolves.toEqual({ status: "resolved" });

    const database = getDatabase();
    const [removedBusiness] = await database
      .select({ status: business.status })
      .from(business)
      .where(eq(business.id, fixture.duplicateBusinessId));
    const [removedSite] = await database
      .select({ status: businessSite.status })
      .from(businessSite)
      .where(eq(businessSite.businessId, fixture.duplicateBusinessId));
    const [removedPublication] = await database
      .select({ status: businessPublication.status })
      .from(businessPublication)
      .where(eq(businessPublication.businessId, fixture.duplicateBusinessId));
    expect([removedBusiness?.status, removedSite?.status, removedPublication?.status]).toEqual([
      "removed",
      "removed",
      "removed",
    ]);

    const mergedMemberships = await database
      .select({ userId: businessMembership.userId, role: businessMembership.role })
      .from(businessMembership)
      .where(eq(businessMembership.businessId, fixture.primaryBusinessId));
    expect(mergedMemberships).toEqual(
      expect.arrayContaining([
        { userId: fixture.duplicateOwnerId, role: "manager" },
        { userId: fixture.duplicateEditorId, role: "editor" },
        { userId: fixture.duplicateViewerId, role: "viewer" },
      ]),
    );

    await expect(
      resolveBusinessTicket({
        adminUserId: fixture.adminId,
        ticketId: ticket.ticketId,
        action: "restore_duplicate",
        note: "Restored through the explicit recovery route.",
      }),
    ).resolves.toEqual({ status: "resolved" });

    const [restoredBusiness] = await database
      .select({ status: business.status })
      .from(business)
      .where(eq(business.id, fixture.duplicateBusinessId));
    const [restoredSite] = await database
      .select({ status: businessSite.status })
      .from(businessSite)
      .where(eq(businessSite.businessId, fixture.duplicateBusinessId));
    const [restoredPublication] = await database
      .select({ status: businessPublication.status })
      .from(businessPublication)
      .where(eq(businessPublication.businessId, fixture.duplicateBusinessId));
    expect([restoredBusiness?.status, restoredSite?.status, restoredPublication?.status]).toEqual([
      "published",
      "published",
      "published",
    ]);

    const copiedAfterRestore = await database
      .select({ userId: businessMembership.userId })
      .from(businessMembership)
      .where(
        and(
          eq(businessMembership.businessId, fixture.primaryBusinessId),
          eq(businessMembership.userId, fixture.duplicateOwnerId),
        ),
      );
    expect(copiedAfterRestore).toEqual([]);
  });
});
