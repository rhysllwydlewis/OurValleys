import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, businessMembership } from "@/lib/database/schema/business";
import { businessInvitation } from "@/lib/database/schema/business-governance";
import {
  businessMembershipRoles,
  permissionsForBusinessRole,
  type BusinessMembershipRole,
} from "@/modules/identity/access-policy";
import { sendTransactionalEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site";

/**
 * Invitations never grant ownership directly. Adding another owner is a
 * deliberate role change made by an existing owner after someone has
 * already accepted a lesser role, not something a link to an unverified
 * inbox can do on its own.
 */
export const businessInvitationRoles = ["manager", "editor", "viewer"] as const;
export type BusinessInvitationRole = (typeof businessInvitationRoles)[number];

const invitationTtlMs = 7 * 24 * 60 * 60 * 1000;

const inviteSchema = z.object({
  businessId: z.uuid(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email())
    .pipe(z.string().max(254)),
  role: z.enum(businessInvitationRoles),
});

export type TeamMemberView = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: BusinessMembershipRole;
  acceptedAt: Date | null;
};

export type PendingInvitationView = {
  id: string;
  email: string;
  role: BusinessInvitationRole;
  invitedByName: string | null;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
};

export type BusinessTeamResult =
  | {
      state: "ready";
      members: TeamMemberView[];
      invitations: PendingInvitationView[];
    }
  | { state: "unavailable"; members: []; invitations: [] };

export async function listBusinessTeam(
  businessId: string,
): Promise<BusinessTeamResult> {
  try {
    const database = getDatabase();
    const [members, invitations] = await Promise.all([
      database
        .select({
          membershipId: businessMembership.id,
          userId: businessMembership.userId,
          name: user.name,
          email: user.email,
          role: businessMembership.role,
          acceptedAt: businessMembership.acceptedAt,
        })
        .from(businessMembership)
        .innerJoin(user, eq(user.id, businessMembership.userId))
        .where(
          and(
            eq(businessMembership.businessId, businessId),
            eq(businessMembership.status, "active"),
          ),
        )
        .orderBy(asc(businessMembership.role), asc(user.name)),
      database
        .select({
          id: businessInvitation.id,
          email: businessInvitation.email,
          role: businessInvitation.role,
          invitedByName: user.name,
          createdAt: businessInvitation.createdAt,
          expiresAt: businessInvitation.expiresAt,
        })
        .from(businessInvitation)
        .leftJoin(user, eq(user.id, businessInvitation.invitedByUserId))
        .where(
          and(
            eq(businessInvitation.businessId, businessId),
            eq(businessInvitation.status, "pending"),
          ),
        )
        .orderBy(asc(businessInvitation.createdAt)),
    ]);

    const now = new Date();
    return {
      state: "ready",
      members: members
        .filter((row) =>
          (businessMembershipRoles as readonly string[]).includes(row.role),
        )
        .map((row) => ({
          ...row,
          role: row.role as BusinessMembershipRole,
        })),
      invitations: invitations
        .filter((row) =>
          (businessInvitationRoles as readonly string[]).includes(row.role),
        )
        .map((row) => ({
          ...row,
          role: row.role as BusinessInvitationRole,
          isExpired: row.expiresAt.getTime() < now.getTime(),
        })),
    };
  } catch {
    return { state: "unavailable", members: [], invitations: [] };
  }
}

export type InviteMemberResult =
  | { status: "invited" }
  | { status: "invalid"; message: string }
  | { status: "already_member" }
  | { status: "invitation_pending" }
  | { status: "unavailable" };

export async function inviteBusinessMember(input: {
  businessId: string;
  email: string;
  role: BusinessInvitationRole;
  invitedByUserId: string;
}): Promise<InviteMemberResult> {
  const parsed = inviteSchema.safeParse({
    businessId: input.businessId,
    email: input.email,
    role: input.role,
  });
  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Enter a valid email address and choose a role.",
    };
  }
  const { businessId, email, role } = parsed.data;

  try {
    const database = getDatabase();

    const [businessRow] = await database
      .select({ tradingName: business.tradingName })
      .from(business)
      .where(eq(business.id, businessId))
      .limit(1);
    if (!businessRow)
      return { status: "invalid", message: "Unknown business." };

    const [existingMember] = await database
      .select({ id: businessMembership.id })
      .from(businessMembership)
      .innerJoin(user, eq(user.id, businessMembership.userId))
      .where(
        and(
          eq(businessMembership.businessId, businessId),
          eq(businessMembership.status, "active"),
          eq(user.email, email),
        ),
      )
      .limit(1);
    if (existingMember) return { status: "already_member" };

    const now = new Date();
    const [existingInvitation] = await database
      .select({
        id: businessInvitation.id,
        expiresAt: businessInvitation.expiresAt,
      })
      .from(businessInvitation)
      .where(
        and(
          eq(businessInvitation.businessId, businessId),
          eq(businessInvitation.email, email),
          eq(businessInvitation.status, "pending"),
        ),
      )
      .limit(1);
    if (
      existingInvitation &&
      existingInvitation.expiresAt.getTime() > now.getTime()
    ) {
      return { status: "invitation_pending" };
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(now.getTime() + invitationTtlMs);

    if (existingInvitation) {
      await database
        .update(businessInvitation)
        .set({
          role,
          invitedByUserId: input.invitedByUserId,
          token,
          expiresAt,
          createdAt: now,
        })
        .where(eq(businessInvitation.id, existingInvitation.id));
    } else {
      await database.insert(businessInvitation).values({
        businessId,
        email,
        role,
        invitedByUserId: input.invitedByUserId,
        token,
        expiresAt,
      });
    }

    const acceptUrl = new URL(`/invitations/${token}`, getSiteUrl()).toString();
    try {
      await sendTransactionalEmail({
        to: email,
        subject: `You have been invited to help manage ${businessRow.tradingName} on OurValleys`,
        text: [
          `You have been invited to join the team for ${businessRow.tradingName} as a ${role}.`,
          "",
          `Accept the invitation: ${acceptUrl}`,
          "",
          `This invitation expires on ${expiresAt.toDateString()}. If you did not expect this, you can ignore this email.`,
        ].join("\n"),
      });
    } catch {
      // The invitation record still exists and can be shared or resent.
    }

    return { status: "invited" };
  } catch {
    return { status: "unavailable" };
  }
}

export type RevokeInvitationResult = "revoked" | "not_found" | "unavailable";

export async function revokeBusinessInvitation(input: {
  businessId: string;
  invitationId: string;
}): Promise<RevokeInvitationResult> {
  try {
    const database = getDatabase();
    const [updated] = await database
      .update(businessInvitation)
      .set({ status: "revoked" })
      .where(
        and(
          eq(businessInvitation.id, input.invitationId),
          eq(businessInvitation.businessId, input.businessId),
          eq(businessInvitation.status, "pending"),
        ),
      )
      .returning({ id: businessInvitation.id });
    return updated ? "revoked" : "not_found";
  } catch {
    return "unavailable";
  }
}

export type RemoveMemberResult =
  "removed" | "not_found" | "last_owner" | "unavailable";

export async function removeBusinessMember(input: {
  businessId: string;
  membershipId: string;
}): Promise<RemoveMemberResult> {
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:team`}))`,
      );
      const [membership] = await transaction
        .select({
          id: businessMembership.id,
          role: businessMembership.role,
        })
        .from(businessMembership)
        .where(
          and(
            eq(businessMembership.id, input.membershipId),
            eq(businessMembership.businessId, input.businessId),
            eq(businessMembership.status, "active"),
          ),
        )
        .for("update")
        .limit(1);
      if (!membership) return "not_found" as const;

      if (membership.role === "owner") {
        const [otherOwners] = await transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(businessMembership)
          .where(
            and(
              eq(businessMembership.businessId, input.businessId),
              eq(businessMembership.role, "owner"),
              eq(businessMembership.status, "active"),
              ne(businessMembership.id, input.membershipId),
            ),
          );
        if ((otherOwners?.count ?? 0) === 0) return "last_owner" as const;
      }

      await transaction
        .update(businessMembership)
        .set({ status: "removed" })
        .where(eq(businessMembership.id, input.membershipId));
      return "removed" as const;
    });
  } catch {
    return "unavailable";
  }
}

export type ChangeRoleResult =
  "updated" | "not_found" | "last_owner" | "invalid" | "unavailable";

export async function changeBusinessMemberRole(input: {
  businessId: string;
  membershipId: string;
  role: string;
}): Promise<ChangeRoleResult> {
  if (!(businessMembershipRoles as readonly string[]).includes(input.role)) {
    return "invalid";
  }
  const role = input.role as BusinessMembershipRole;

  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:team`}))`,
      );
      const [membership] = await transaction
        .select({
          id: businessMembership.id,
          role: businessMembership.role,
        })
        .from(businessMembership)
        .where(
          and(
            eq(businessMembership.id, input.membershipId),
            eq(businessMembership.businessId, input.businessId),
            eq(businessMembership.status, "active"),
          ),
        )
        .for("update")
        .limit(1);
      if (!membership) return "not_found" as const;

      if (membership.role === "owner" && role !== "owner") {
        const [otherOwners] = await transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(businessMembership)
          .where(
            and(
              eq(businessMembership.businessId, input.businessId),
              eq(businessMembership.role, "owner"),
              eq(businessMembership.status, "active"),
              ne(businessMembership.id, input.membershipId),
            ),
          );
        if ((otherOwners?.count ?? 0) === 0) return "last_owner" as const;
      }

      await transaction
        .update(businessMembership)
        .set({ role, permissions: permissionsForBusinessRole(role) })
        .where(eq(businessMembership.id, input.membershipId));
      return "updated" as const;
    });
  } catch {
    return "unavailable";
  }
}

export type AcceptInvitationResult =
  | { status: "accepted"; businessId: string; role: BusinessMembershipRole }
  | {
      status: "already_member";
      businessId: string;
      role: BusinessMembershipRole;
    }
  | { status: "email_mismatch" }
  | { status: "expired" }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function acceptBusinessInvitation(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<AcceptInvitationResult> {
  if (!/^[a-f0-9]{64}$/.test(input.token)) return { status: "not_found" };

  try {
    const database = getDatabase();
    const [invitation] = await database
      .select({
        id: businessInvitation.id,
        businessId: businessInvitation.businessId,
        email: businessInvitation.email,
        role: businessInvitation.role,
        status: businessInvitation.status,
        expiresAt: businessInvitation.expiresAt,
      })
      .from(businessInvitation)
      .where(eq(businessInvitation.token, input.token))
      .limit(1);
    if (!invitation || invitation.status !== "pending") {
      return { status: "not_found" };
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await database
        .update(businessInvitation)
        .set({ status: "expired" })
        .where(eq(businessInvitation.id, invitation.id));
      return { status: "expired" };
    }
    if (invitation.email !== input.userEmail.trim().toLowerCase()) {
      return { status: "email_mismatch" };
    }

    return await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${invitation.businessId}:team`}))`,
      );

      const [existingMembership] = await transaction
        .select({
          id: businessMembership.id,
          status: businessMembership.status,
          role: businessMembership.role,
        })
        .from(businessMembership)
        .where(
          and(
            eq(businessMembership.businessId, invitation.businessId),
            eq(businessMembership.userId, input.userId),
          ),
        )
        .for("update")
        .limit(1);

      if (existingMembership?.status === "active") {
        await transaction
          .update(businessInvitation)
          .set({
            status: "accepted",
            acceptedByUserId: input.userId,
            acceptedAt: sql`now()`,
          })
          .where(eq(businessInvitation.id, invitation.id));
        return {
          status: "already_member",
          businessId: invitation.businessId,
          role: existingMembership.role as BusinessMembershipRole,
        } as const;
      }

      const role = invitation.role as BusinessInvitationRole;
      await transaction
        .insert(businessMembership)
        .values({
          businessId: invitation.businessId,
          userId: input.userId,
          role,
          permissions: permissionsForBusinessRole(role),
          status: "active",
          acceptedAt: sql`now()`,
        })
        .onConflictDoUpdate({
          target: [businessMembership.businessId, businessMembership.userId],
          set: {
            role,
            permissions: permissionsForBusinessRole(role),
            status: "active",
            acceptedAt: sql`now()`,
          },
        });

      await transaction
        .update(businessInvitation)
        .set({
          status: "accepted",
          acceptedByUserId: input.userId,
          acceptedAt: sql`now()`,
        })
        .where(eq(businessInvitation.id, invitation.id));

      return {
        status: "accepted",
        businessId: invitation.businessId,
        role,
      } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}
