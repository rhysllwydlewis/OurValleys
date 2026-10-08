import { and, eq, inArray } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Only email is faked; the roles, locks and transaction are the real code.
const sentEmails: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: async (message: {
    to: string;
    subject: string;
    text: string;
  }) => {
    sentEmails.push(message);
  },
}));

import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import { transferBusinessOwnership } from "@/modules/businesses/team";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002501",
  businessA: "00000000-0000-4000-8000-000000002502",
  businessB: "00000000-0000-4000-8000-000000002503",
  ownerId: "00000000-0000-4000-8000-000000002504",
  managerId: "00000000-0000-4000-8000-000000002505",
  unverifiedId: "00000000-0000-4000-8000-000000002506",
  otherOwnerId: "00000000-0000-4000-8000-000000002507",
} as const;
const userIds = [
  fixture.ownerId,
  fixture.managerId,
  fixture.unverifiedId,
  fixture.otherOwnerId,
];
const name = "Transfer Fixture A";

async function membershipOf(
  userId: string,
  businessId: string = fixture.businessA,
) {
  const [row] = await getDatabase()
    .select()
    .from(businessMembership)
    .where(
      and(
        eq(businessMembership.userId, userId),
        eq(businessMembership.businessId, businessId),
      ),
    );
  if (!row) throw new Error("Expected a membership.");
  return row;
}

describeDatabase("explicit ownership transfer", () => {
  beforeEach(async () => {
    sentEmails.length = 0;
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Owner",
        email: "owner.a@example.test",
        emailVerified: true,
      },
      {
        id: fixture.managerId,
        name: "Manager",
        email: "manager.a@example.test",
        emailVerified: true,
      },
      {
        id: fixture.unverifiedId,
        name: "Editor",
        email: "editor.a@example.test",
        emailVerified: false,
      },
      {
        id: fixture.otherOwnerId,
        name: "Other",
        email: "owner.b@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Transfer fixtures",
      slug: "transfer-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values(
      [
        [fixture.businessA, name, "transfer-fixture-a"],
        [fixture.businessB, "Transfer Fixture B", "transfer-fixture-b"],
      ].map(([id, tradingName, slug]) => ({
        id: id!,
        tradingName: tradingName!,
        slug: slug!,
        summary: "A fictional business used only by transfer tests.",
        description: "A fictional business used only by transfer tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "service_area",
        status: "published",
        createdByUserId: fixture.ownerId,
      })),
    );
    await database.insert(businessMembership).values(
      [
        {
          businessId: fixture.businessA,
          userId: fixture.ownerId,
          role: "owner",
        },
        {
          businessId: fixture.businessA,
          userId: fixture.managerId,
          role: "manager",
        },
        {
          businessId: fixture.businessA,
          userId: fixture.unverifiedId,
          role: "editor",
        },
        {
          businessId: fixture.businessB,
          userId: fixture.otherOwnerId,
          role: "owner",
        },
      ].map((row) => ({
        ...row,
        permissions: permissionsForBusinessRole(row.role as "owner"),
        status: "active",
      })),
    );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(business)
      .where(inArray(business.id, [fixture.businessA, fixture.businessB]));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(inArray(user.id, userIds));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const transfer = async (
    overrides: Partial<Parameters<typeof transferBusinessOwnership>[0]> = {},
  ) =>
    transferBusinessOwnership({
      businessId: fixture.businessA,
      actorUserId: fixture.ownerId,
      targetMembershipId: (await membershipOf(fixture.managerId)).id,
      mode: "transfer",
      confirmName: name,
      ...overrides,
    });

  it("transfers: the new owner gets the owner permissions, the actor becomes a manager, and both are emailed", async () => {
    await expect(transfer()).resolves.toEqual({ status: "transferred" });
    const next = await membershipOf(fixture.managerId);
    const previous = await membershipOf(fixture.ownerId);
    expect(next.role).toBe("owner");
    expect(next.permissions).toEqual(permissionsForBusinessRole("owner"));
    expect(previous.role).toBe("manager");
    expect(previous.permissions).toEqual(permissionsForBusinessRole("manager"));
    expect(sentEmails.map((email) => email.to).sort()).toEqual([
      "manager.a@example.test",
      "owner.a@example.test",
    ]);
    expect(sentEmails[0]?.subject).toContain(name);
  });

  it("shares: both are owners afterwards", async () => {
    await expect(transfer({ mode: "share" })).resolves.toEqual({
      status: "shared",
    });
    expect((await membershipOf(fixture.ownerId)).role).toBe("owner");
    expect((await membershipOf(fixture.managerId)).role).toBe("owner");
  });

  it("changes nothing when refused", async () => {
    const unverified = (await membershipOf(fixture.unverifiedId)).id;
    const owner = (await membershipOf(fixture.ownerId)).id;
    const manager = (await membershipOf(fixture.managerId)).id;
    const foreign = (
      await membershipOf(fixture.otherOwnerId, fixture.businessB)
    ).id;

    await expect(transfer({ confirmName: "Wrong name" })).resolves.toEqual({
      status: "confirmation_mismatch",
    });
    await expect(transfer({ confirmName: "" })).resolves.toEqual({
      status: "confirmation_mismatch",
    });
    await expect(transfer({ targetMembershipId: unverified })).resolves.toEqual(
      {
        status: "unverified",
      },
    );
    await expect(transfer({ targetMembershipId: owner })).resolves.toEqual({
      status: "self",
    });
    // A manager cannot hand out ownership, even to themselves.
    await expect(
      transfer({ actorUserId: fixture.managerId, targetMembershipId: manager }),
    ).resolves.toEqual({ status: "not_owner" });
    // Another business's membership is never reachable from this business.
    await expect(transfer({ targetMembershipId: foreign })).resolves.toEqual({
      status: "not_found",
    });
    // An owner of another business has no authority here.
    await expect(
      transfer({ actorUserId: fixture.otherOwnerId }),
    ).resolves.toEqual({ status: "not_owner" });

    expect((await membershipOf(fixture.ownerId)).role).toBe("owner");
    expect((await membershipOf(fixture.managerId)).role).toBe("manager");
    expect((await membershipOf(fixture.unverifiedId)).role).toBe("editor");
    expect(
      (await membershipOf(fixture.otherOwnerId, fixture.businessB)).role,
    ).toBe("owner");
    expect(sentEmails).toHaveLength(0);
  });

  it("refuses to make an owner who already is one", async () => {
    await transfer({ mode: "share" });
    await expect(transfer({ mode: "share" })).resolves.toEqual({
      status: "already_owner",
    });
  });
});
