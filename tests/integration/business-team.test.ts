import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import { businessInvitation } from "@/lib/database/schema/business-governance";
import {
  acceptBusinessInvitation,
  changeBusinessMemberRole,
  inviteBusinessMember,
  listBusinessTeam,
  removeBusinessMember,
  revokeBusinessInvitation,
} from "@/modules/businesses/team";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002301",
  businessId: "00000000-0000-4000-8000-000000002302",
  ownerId: "00000000-0000-4000-8000-000000002303",
  inviteeId: "00000000-0000-4000-8000-000000002304",
} as const;

const inviteeEmail = "team.invitee@example.test";

describeDatabase("business team management", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Team Owner",
        email: "team.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.inviteeId,
        name: "Team Invitee",
        email: inviteeEmail,
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Team fixtures",
      slug: "team-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Team Fixture Business",
      slug: "team-fixture-business",
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
      .delete(businessInvitation)
      .where(eq(businessInvitation.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
    await database.delete(user).where(eq(user.id, fixture.inviteeId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("invites, accepts and lists a new team member", async () => {
    await expect(
      inviteBusinessMember({
        businessId: fixture.businessId,
        email: inviteeEmail,
        role: "editor",
        invitedByUserId: fixture.ownerId,
      }),
    ).resolves.toEqual({ status: "invited" });

    const pending = await listBusinessTeam(fixture.businessId);
    expect(pending.state).toBe("ready");
    if (pending.state !== "ready") throw new Error("Expected ready state.");
    expect(pending.invitations).toHaveLength(1);
    expect(pending.invitations[0]?.email).toBe(inviteeEmail);
    expect(pending.invitations[0]?.role).toBe("editor");

    const [invitationRow] = await getDatabase()
      .select({ token: businessInvitation.token })
      .from(businessInvitation)
      .where(
        and(
          eq(businessInvitation.businessId, fixture.businessId),
          eq(businessInvitation.email, inviteeEmail),
        ),
      );
    if (!invitationRow) throw new Error("Expected an invitation row.");

    await expect(
      acceptBusinessInvitation({
        token: invitationRow.token,
        userId: fixture.inviteeId,
        userEmail: inviteeEmail,
      }),
    ).resolves.toEqual({
      status: "accepted",
      businessId: fixture.businessId,
      role: "editor",
    });

    const afterAccept = await listBusinessTeam(fixture.businessId);
    if (afterAccept.state !== "ready") throw new Error("Expected ready state.");
    expect(afterAccept.invitations).toHaveLength(0);
    expect(afterAccept.members.map((member) => member.email)).toContain(
      inviteeEmail,
    );
    expect(
      afterAccept.members.find((member) => member.email === inviteeEmail)?.role,
    ).toBe("editor");
  });

  it("rejects accepting an invitation from a different email address", async () => {
    await inviteBusinessMember({
      businessId: fixture.businessId,
      email: inviteeEmail,
      role: "viewer",
      invitedByUserId: fixture.ownerId,
    });
    const [invitationRow] = await getDatabase()
      .select({ token: businessInvitation.token })
      .from(businessInvitation)
      .where(eq(businessInvitation.businessId, fixture.businessId));
    if (!invitationRow) throw new Error("Expected an invitation row.");

    await expect(
      acceptBusinessInvitation({
        token: invitationRow.token,
        userId: fixture.inviteeId,
        userEmail: "someone.else@example.test",
      }),
    ).resolves.toEqual({ status: "email_mismatch" });
  });

  it("blocks a duplicate pending invitation and an invitation to an existing member", async () => {
    await expect(
      inviteBusinessMember({
        businessId: fixture.businessId,
        email: "team.owner@example.test",
        role: "manager",
        invitedByUserId: fixture.ownerId,
      }),
    ).resolves.toEqual({ status: "already_member" });

    await expect(
      inviteBusinessMember({
        businessId: fixture.businessId,
        email: inviteeEmail,
        role: "manager",
        invitedByUserId: fixture.ownerId,
      }),
    ).resolves.toEqual({ status: "invited" });
    await expect(
      inviteBusinessMember({
        businessId: fixture.businessId,
        email: inviteeEmail,
        role: "viewer",
        invitedByUserId: fixture.ownerId,
      }),
    ).resolves.toEqual({ status: "invitation_pending" });
  });

  it("revokes a pending invitation so it can no longer be accepted", async () => {
    await inviteBusinessMember({
      businessId: fixture.businessId,
      email: inviteeEmail,
      role: "editor",
      invitedByUserId: fixture.ownerId,
    });
    const [invitationRow] = await getDatabase()
      .select({ id: businessInvitation.id, token: businessInvitation.token })
      .from(businessInvitation)
      .where(eq(businessInvitation.businessId, fixture.businessId));
    if (!invitationRow) throw new Error("Expected an invitation row.");

    await expect(
      revokeBusinessInvitation({
        businessId: fixture.businessId,
        invitationId: invitationRow.id,
      }),
    ).resolves.toBe("revoked");

    await expect(
      acceptBusinessInvitation({
        token: invitationRow.token,
        userId: fixture.inviteeId,
        userEmail: inviteeEmail,
      }),
    ).resolves.toEqual({ status: "not_found" });
  });

  it("protects the last remaining owner from removal or demotion", async () => {
    const [ownerMembership] = await getDatabase()
      .select({ id: businessMembership.id })
      .from(businessMembership)
      .where(
        and(
          eq(businessMembership.businessId, fixture.businessId),
          eq(businessMembership.userId, fixture.ownerId),
        ),
      );
    if (!ownerMembership) throw new Error("Expected an owner membership.");

    await expect(
      removeBusinessMember({
        businessId: fixture.businessId,
        membershipId: ownerMembership.id,
      }),
    ).resolves.toBe("last_owner");

    await expect(
      changeBusinessMemberRole({
        businessId: fixture.businessId,
        membershipId: ownerMembership.id,
        role: "manager",
      }),
    ).resolves.toBe("last_owner");
  });

  it("allows removing a non-owner member and promoting a second owner", async () => {
    await inviteBusinessMember({
      businessId: fixture.businessId,
      email: inviteeEmail,
      role: "manager",
      invitedByUserId: fixture.ownerId,
    });
    const [invitationRow] = await getDatabase()
      .select({ token: businessInvitation.token })
      .from(businessInvitation)
      .where(eq(businessInvitation.businessId, fixture.businessId));
    if (!invitationRow) throw new Error("Expected an invitation row.");
    await acceptBusinessInvitation({
      token: invitationRow.token,
      userId: fixture.inviteeId,
      userEmail: inviteeEmail,
    });

    const [inviteeMembership] = await getDatabase()
      .select({ id: businessMembership.id })
      .from(businessMembership)
      .where(
        and(
          eq(businessMembership.businessId, fixture.businessId),
          eq(businessMembership.userId, fixture.inviteeId),
        ),
      );
    if (!inviteeMembership) throw new Error("Expected an invitee membership.");

    await expect(
      changeBusinessMemberRole({
        businessId: fixture.businessId,
        membershipId: inviteeMembership.id,
        role: "owner",
      }),
    ).resolves.toBe("updated");

    const [ownerMembership] = await getDatabase()
      .select({ id: businessMembership.id })
      .from(businessMembership)
      .where(
        and(
          eq(businessMembership.businessId, fixture.businessId),
          eq(businessMembership.userId, fixture.ownerId),
        ),
      );
    if (!ownerMembership) throw new Error("Expected an owner membership.");

    await expect(
      removeBusinessMember({
        businessId: fixture.businessId,
        membershipId: ownerMembership.id,
      }),
    ).resolves.toBe("removed");

    const remaining = await listBusinessTeam(fixture.businessId);
    if (remaining.state !== "ready") throw new Error("Expected ready state.");
    expect(remaining.members).toHaveLength(1);
    expect(remaining.members[0]?.userId).toBe(fixture.inviteeId);
    expect(remaining.members[0]?.role).toBe("owner");
  });
});
