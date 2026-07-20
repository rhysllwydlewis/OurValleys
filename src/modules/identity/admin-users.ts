import "server-only";
import { count, desc, eq, ilike, or } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, businessMembership } from "@/lib/database/schema/business";

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  banned: boolean;
  createdAt: Date;
};

export type AdminUserListResult =
  | { state: "ready"; users: AdminUserSummary[] }
  | { state: "unavailable"; users: [] };

export async function listUsersForAdmin(
  query?: string,
): Promise<AdminUserListResult> {
  try {
    const database = getDatabase();
    const trimmed = query?.trim().slice(0, 120);
    const filter = trimmed
      ? or(ilike(user.name, `%${trimmed}%`), ilike(user.email, `%${trimmed}%`))
      : undefined;

    const rows = await database
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(filter)
      .orderBy(desc(user.createdAt))
      .limit(100);

    return { state: "ready", users: rows };
  } catch {
    return { state: "unavailable", users: [] };
  }
}

export async function countTotalUsers(): Promise<number> {
  try {
    const database = getDatabase();
    const [row] = await database.select({ value: count() }).from(user);
    return row?.value ?? 0;
  } catch {
    return 0;
  }
}

export type AdminUserMembership = {
  membershipId: string;
  businessId: string;
  businessTradingName: string;
  role: string;
  status: string;
};

export type AdminUserDetail = AdminUserSummary & {
  banReason: string | null;
  banExpires: Date | null;
  memberships: AdminUserMembership[];
};

export type AdminUserDetailResult =
  | { state: "ready"; user: AdminUserDetail }
  | { state: "missing" }
  | { state: "unavailable" };

export async function getUserDetailForAdmin(
  userId: string,
): Promise<AdminUserDetailResult> {
  try {
    const database = getDatabase();
    const [userRow] = await database
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!userRow) return { state: "missing" };

    const memberships = await database
      .select({
        membershipId: businessMembership.id,
        businessId: business.id,
        businessTradingName: business.tradingName,
        role: businessMembership.role,
        status: businessMembership.status,
      })
      .from(businessMembership)
      .innerJoin(business, eq(business.id, businessMembership.businessId))
      .where(eq(businessMembership.userId, userId));

    return { state: "ready", user: { ...userRow, memberships } };
  } catch {
    return { state: "unavailable" };
  }
}

export type UpdateMembershipResult =
  { status: "updated" } | { status: "not_found" } | { status: "unavailable" };

const membershipStatuses = ["active", "suspended"] as const;
export type MembershipStatus = (typeof membershipStatuses)[number];
export function isMembershipStatus(value: string): value is MembershipStatus {
  return (membershipStatuses as readonly string[]).includes(value);
}

export async function setMembershipStatus(input: {
  membershipId: string;
  status: MembershipStatus;
}): Promise<UpdateMembershipResult> {
  try {
    const database = getDatabase();
    const [updated] = await database
      .update(businessMembership)
      .set({ status: input.status })
      .where(eq(businessMembership.id, input.membershipId))
      .returning({ id: businessMembership.id });
    return updated ? { status: "updated" } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function removeMembership(input: {
  membershipId: string;
}): Promise<UpdateMembershipResult> {
  try {
    const database = getDatabase();
    const [deleted] = await database
      .delete(businessMembership)
      .where(eq(businessMembership.id, input.membershipId))
      .returning({ id: businessMembership.id });
    return deleted ? { status: "updated" } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}
