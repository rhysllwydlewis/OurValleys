import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import {
  businessSlugRedirect,
  businessTicket,
} from "@/lib/database/schema/business-operations";
import {
  getOpenSlugChangeRequest,
  requestBusinessSlugChange,
  resolveBusinessTicket,
} from "@/modules/businesses/tickets";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002401",
  businessA: "00000000-0000-4000-8000-000000002402",
  businessB: "00000000-0000-4000-8000-000000002403",
  ownerId: "00000000-0000-4000-8000-000000002404",
  adminId: "00000000-0000-4000-8000-000000002405",
} as const;
const businessIds = [fixture.businessA, fixture.businessB];
const reason = "The trading name has changed, so the address should too.";

async function slugOf(id: string) {
  const [row] = await getDatabase()
    .select({ slug: business.slug })
    .from(business)
    .where(eq(business.id, id));
  return row?.slug;
}

async function approve(proposedName: string) {
  const request = await requestBusinessSlugChange({
    businessId: fixture.businessA,
    userId: fixture.ownerId,
    proposedName,
    reason,
  });
  if (request.status !== "requested") throw new Error(request.status);
  return resolveBusinessTicket({
    adminUserId: fixture.adminId,
    ticketId: request.ticketId,
    action: "approve_slug_change",
    note: "Approved in an automated test.",
  });
}

describeDatabase("owner slug-change request", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Slug Owner",
        email: "slug.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.adminId,
        name: "Slug Admin",
        email: "slug.admin@example.test",
        emailVerified: true,
        role: "admin",
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Slug fixtures",
      slug: "slug-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [fixture.businessA, "Slug Fixture A", "slug-fixture-a"],
        [fixture.businessB, "Slug Fixture B", "slug-fixture-b"],
      ].map(([id, tradingName, slug]) => ({
        id: id!,
        tradingName: tradingName!,
        slug: slug!,
        summary: "A fictional business used only by slug tests.",
        description: "A fictional business used only by slug tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "draft",
        createdByUserId: fixture.ownerId,
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessSlugRedirect)
      .where(inArray(businessSlugRedirect.businessId, businessIds));
    await database
      .delete(businessTicket)
      .where(inArray(businessTicket.businessId, businessIds));
    await database.delete(business).where(inArray(business.id, businessIds));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database
      .delete(user)
      .where(inArray(user.id, [fixture.ownerId, fixture.adminId]));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("raises a ticket without changing the address", async () => {
    const result = await requestBusinessSlugChange({
      businessId: fixture.businessA,
      userId: fixture.ownerId,
      proposedName: "  Brand New & Better!  ",
      reason,
    });
    expect(result).toMatchObject({
      status: "requested",
      proposedSlug: "brand-new-and-better",
    });
    expect(await slugOf(fixture.businessA)).toBe("slug-fixture-a");
    await expect(
      getOpenSlugChangeRequest(fixture.businessA),
    ).resolves.toMatchObject({
      proposedSlug: "brand-new-and-better",
      status: "open",
    });
    await expect(
      getOpenSlugChangeRequest(fixture.businessB),
    ).resolves.toBeNull();
  });

  it("refuses unusable, unchanged, taken and duplicate requests", async () => {
    const base = {
      businessId: fixture.businessA,
      userId: fixture.ownerId,
      reason,
    };
    await expect(
      requestBusinessSlugChange({ ...base, proposedName: "??" }),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      requestBusinessSlugChange({
        ...base,
        proposedName: "Fine name",
        reason: "short",
      }),
    ).resolves.toEqual({ status: "invalid" });
    await expect(
      requestBusinessSlugChange({ ...base, proposedName: "Slug Fixture A" }),
    ).resolves.toEqual({ status: "same" });
    await expect(
      requestBusinessSlugChange({ ...base, proposedName: "Slug Fixture B" }),
    ).resolves.toEqual({ status: "taken" });

    await getDatabase().insert(businessSlugRedirect).values({
      businessId: fixture.businessB,
      fromSlug: "older-b-name",
      toSlug: "slug-fixture-b",
    });
    await expect(
      requestBusinessSlugChange({ ...base, proposedName: "Older B Name" }),
    ).resolves.toEqual({ status: "taken" });

    await expect(
      requestBusinessSlugChange({ ...base, proposedName: "First choice" }),
    ).resolves.toMatchObject({ status: "requested" });
    await expect(
      requestBusinessSlugChange({ ...base, proposedName: "Second choice" }),
    ).resolves.toEqual({ status: "pending" });
  });

  it("keeps the old address as a redirect once approved", async () => {
    await expect(approve("Renamed Fixture")).resolves.toEqual({
      status: "resolved",
    });
    expect(await slugOf(fixture.businessA)).toBe("renamed-fixture");
    const redirects = await getDatabase()
      .select()
      .from(businessSlugRedirect)
      .where(eq(businessSlugRedirect.businessId, fixture.businessA));
    expect(redirects.map((r) => [r.fromSlug, r.toSlug])).toEqual([
      ["slug-fixture-a", "renamed-fixture"],
    ]);
    await expect(
      getOpenSlugChangeRequest(fixture.businessA),
    ).resolves.toBeNull();
  });

  it("can move on and then return to an earlier address without breaking redirects", async () => {
    await approve("Second Name");
    await approve("Third Name");
    await expect(approve("Slug Fixture A")).resolves.toEqual({
      status: "resolved",
    });
    expect(await slugOf(fixture.businessA)).toBe("slug-fixture-a");

    const redirects = await getDatabase()
      .select()
      .from(businessSlugRedirect)
      .where(eq(businessSlugRedirect.businessId, fixture.businessA));
    const map = new Map(redirects.map((r) => [r.fromSlug, r.toSlug]));
    // The live address is never a redirect source; every older address
    // reaches it in one hop.
    expect(map.has("slug-fixture-a")).toBe(false);
    expect(map.get("second-name")).toBe("slug-fixture-a");
    expect(map.get("third-name")).toBe("slug-fixture-a");
  });
});
