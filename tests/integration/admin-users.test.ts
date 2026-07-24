import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import {
  countTotalUsers,
  getUserDetailForAdmin,
  isMembershipStatus,
  listUsersForAdmin,
  removeMembership,
  setMembershipStatus,
} from "@/modules/identity/admin-users";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

describe("isMembershipStatus", () => {
  it("accepts the known membership statuses", () => {
    expect(isMembershipStatus("active")).toBe(true);
    expect(isMembershipStatus("suspended")).toBe(true);
  });

  it("rejects any other value", () => {
    expect(isMembershipStatus("pending")).toBe(false);
    expect(isMembershipStatus("")).toBe(false);
  });
});

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002301",
  businessId: "00000000-0000-4000-8000-000000002302",
  ownerId: "00000000-0000-4000-8000-000000002303",
  otherUserId: "00000000-0000-4000-8000-000000002304",
  missingUserId: "00000000-0000-4000-8000-000000002399",
  missingMembershipId: "00000000-0000-4000-8000-000000002398",
} as const;

describeDatabase("admin user management", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Fixture Admin Users Owner",
        email: "fixture-admin-users-owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.otherUserId,
        name: "Fixture Admin Users Other",
        email: "fixture-admin-users-other@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Admin users fixtures",
      slug: "admin-users-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Admin Users Fixture Business",
      slug: "admin-users-fixture-business",
      summary: "A fictional business used only by automated tests.",
      description: "A fictional business used only by automated tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      status: "published",
      createdByUserId: fixture.ownerId,
    });
    await database.insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: fixture.ownerId,
      role: "owner",
      permissions: permissionsForBusinessRole("owner"),
      status: "active",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessMembership)
      .where(eq(businessMembership.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
    await database.delete(user).where(eq(user.id, fixture.otherUserId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("lists users matching a search query by name or email", async () => {
    const result = await listUsersForAdmin("Fixture Admin Users Owner");
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.users.some((entry) => entry.id === fixture.ownerId)).toBe(
      true,
    );
    expect(result.users.some((entry) => entry.id === fixture.otherUserId)).toBe(
      false,
    );
  });

  it("counts the total number of users", async () => {
    const before = await countTotalUsers();
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.missingUserId,
      name: "Fixture Admin Users Count",
      email: "fixture-admin-users-count@example.test",
    });

    const after = await countTotalUsers();
    expect(after).toBe(before + 1);

    await database.delete(user).where(eq(user.id, fixture.missingUserId));
  });

  it("returns full detail including joined memberships for a known user", async () => {
    const result = await getUserDetailForAdmin(fixture.ownerId);
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.user.id).toBe(fixture.ownerId);
    expect(result.user.memberships).toContainEqual(
      expect.objectContaining({
        businessId: fixture.businessId,
        businessTradingName: "Admin Users Fixture Business",
        role: "owner",
        status: "active",
      }),
    );
  });

  it("reports a missing state for an unknown user id", async () => {
    const result = await getUserDetailForAdmin(fixture.missingUserId);
    expect(result).toEqual({ state: "missing" });
  });

  it("updates a membership status", async () => {
    const database = getDatabase();
    const [membership] = await database
      .select({ id: businessMembership.id })
      .from(businessMembership)
      .where(eq(businessMembership.businessId, fixture.businessId));
    expect(membership).toBeDefined();
    if (!membership) return;

    const updated = await setMembershipStatus({
      membershipId: membership.id,
      status: "suspended",
    });
    expect(updated).toEqual({ status: "updated" });

    const [row] = await database
      .select({ status: businessMembership.status })
      .from(businessMembership)
      .where(eq(businessMembership.id, membership.id));
    expect(row?.status).toBe("suspended");
  });

  it("reports not_found when updating a missing membership", async () => {
    const result = await setMembershipStatus({
      membershipId: fixture.missingMembershipId,
      status: "suspended",
    });
    expect(result).toEqual({ status: "not_found" });
  });

  it("removes a membership", async () => {
    const database = getDatabase();
    const [membership] = await database
      .select({ id: businessMembership.id })
      .from(businessMembership)
      .where(eq(businessMembership.businessId, fixture.businessId));
    expect(membership).toBeDefined();
    if (!membership) return;

    const removed = await removeMembership({ membershipId: membership.id });
    expect(removed).toEqual({ status: "updated" });

    const remaining = await database
      .select({ id: businessMembership.id })
      .from(businessMembership)
      .where(eq(businessMembership.id, membership.id));
    expect(remaining).toHaveLength(0);
  });

  it("reports not_found when removing a missing membership", async () => {
    const result = await removeMembership({
      membershipId: fixture.missingMembershipId,
    });
    expect(result).toEqual({ status: "not_found" });
  });
});
