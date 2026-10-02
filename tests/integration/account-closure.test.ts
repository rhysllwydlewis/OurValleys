import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAuth } from "@/lib/auth";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import { businessTermsAcceptance } from "@/lib/database/schema/business-governance";
import { provisionEmailPasswordAccount } from "@/modules/identity/account-provisioning";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000003101",
  businessId: "00000000-0000-4000-8000-000000003102",
  password: "fixture-account-closure-password",
  ownerEmail: "fixture-closure-owner@example.test",
  coOwnerEmail: "fixture-closure-coowner@example.test",
} as const;

async function signIn(email: string) {
  const auth = getAuth();
  const response = await auth.api.signInEmail({
    body: { email, password: fixture.password },
    asResponse: true,
  });
  const cookie = response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
  return { auth, headers: new Headers({ cookie }) };
}

describeDatabase("account closure and business ownership", () => {
  let ownerId = "";
  let coOwnerId = "";

  beforeEach(async () => {
    ownerId = (
      await provisionEmailPasswordAccount({
        email: fixture.ownerEmail,
        name: "Closure Owner",
        password: fixture.password,
      })
    ).userId;
    coOwnerId = (
      await provisionEmailPasswordAccount({
        email: fixture.coOwnerEmail,
        name: "Closure Co-owner",
        password: fixture.password,
      })
    ).userId;

    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Closure fixtures",
      slug: "closure-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Closure Fixture Business",
      slug: "closure-fixture-business",
      summary: "A fictional test business.",
      description: "A fictional test business used only by automated tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      status: "draft",
      createdByUserId: ownerId,
    });
    await database.insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: ownerId,
      role: "owner",
      permissions: [],
      status: "active",
    });
    await database.insert(businessTermsAcceptance).values({
      businessId: fixture.businessId,
      acceptedByUserId: ownerId,
      termsVersion: "fixture-1",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.email, fixture.ownerEmail));
    await database.delete(user).where(eq(user.email, fixture.coOwnerEmail));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("refuses to delete the account of a business's only owner", async () => {
    const { auth, headers } = await signIn(fixture.ownerEmail);

    await expect(
      auth.api.deleteUser({ body: { password: fixture.password }, headers }),
    ).rejects.toMatchObject({
      body: { code: "SOLE_BUSINESS_OWNER" },
    });

    const [row] = await getDatabase()
      .select()
      .from(user)
      .where(eq(user.id, ownerId));
    expect(row).toBeDefined();
  });

  it("still refuses when the only other owner has been removed", async () => {
    await getDatabase().insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: coOwnerId,
      role: "owner",
      permissions: [],
      status: "removed",
    });
    const { auth, headers } = await signIn(fixture.ownerEmail);

    await expect(
      auth.api.deleteUser({ body: { password: fixture.password }, headers }),
    ).rejects.toMatchObject({ body: { code: "SOLE_BUSINESS_OWNER" } });
  });

  it("deletes a creator's account once another owner exists and keeps the terms record", async () => {
    await getDatabase().insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: coOwnerId,
      role: "owner",
      permissions: [],
      status: "active",
    });
    const { auth, headers } = await signIn(fixture.ownerEmail);

    const result = await auth.api.deleteUser({
      body: { password: fixture.password },
      headers,
    });
    expect(result.success).toBe(true);

    const database = getDatabase();
    const [deleted] = await database
      .select()
      .from(user)
      .where(eq(user.id, ownerId));
    expect(deleted).toBeUndefined();

    const [terms] = await database
      .select()
      .from(businessTermsAcceptance)
      .where(eq(businessTermsAcceptance.businessId, fixture.businessId));
    expect(terms?.termsVersion).toBe("fixture-1");
    expect(terms?.acceptedByUserId).toBeNull();

    const members = await database
      .select()
      .from(businessMembership)
      .where(eq(businessMembership.businessId, fixture.businessId));
    expect(members.map((member) => member.userId)).toEqual([coOwnerId]);
  });

  it("lets a non-owner member delete their account", async () => {
    await getDatabase().insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: coOwnerId,
      role: "editor",
      permissions: [],
      status: "active",
    });
    const { auth, headers } = await signIn(fixture.coOwnerEmail);

    const result = await auth.api.deleteUser({
      body: { password: fixture.password },
      headers,
    });
    expect(result.success).toBe(true);
  });

  it("ignores a removed business when checking for sole ownership", async () => {
    await getDatabase()
      .update(business)
      .set({ status: "removed" })
      .where(eq(business.id, fixture.businessId));
    const { auth, headers } = await signIn(fixture.ownerEmail);

    const result = await auth.api.deleteUser({
      body: { password: fixture.password },
      headers,
    });
    expect(result.success).toBe(true);
  });

  it("counts a suspended owner membership as ownership", async () => {
    await getDatabase()
      .update(businessMembership)
      .set({ status: "suspended" })
      .where(eq(businessMembership.userId, ownerId));
    const { auth, headers } = await signIn(fixture.ownerEmail);

    await expect(
      auth.api.deleteUser({ body: { password: fixture.password }, headers }),
    ).rejects.toMatchObject({ body: { code: "SOLE_BUSINESS_OWNER" } });
  });

  it("lets only one of two co-owners close their account concurrently", async () => {
    await getDatabase().insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: coOwnerId,
      role: "owner",
      permissions: [],
      status: "active",
    });
    const first = await signIn(fixture.ownerEmail);
    const second = await signIn(fixture.coOwnerEmail);

    const results = await Promise.allSettled([
      first.auth.api.deleteUser({
        body: { password: fixture.password },
        headers: first.headers,
      }),
      second.auth.api.deleteUser({
        body: { password: fixture.password },
        headers: second.headers,
      }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const remaining = await getDatabase()
      .select()
      .from(businessMembership)
      .where(
        and(
          eq(businessMembership.businessId, fixture.businessId),
          eq(businessMembership.role, "owner"),
        ),
      );
    expect(remaining).toHaveLength(1);
  });
});
