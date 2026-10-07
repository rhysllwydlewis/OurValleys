import "server-only";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessMembership } from "@/lib/database/schema/business";
import {
  businessPermissions,
  canMembershipPerform,
  isBusinessMembershipRole,
  type BusinessMembershipRole,
  type BusinessPermission,
} from "@/modules/identity/access-policy";

export { businessPermissions, type BusinessPermission };

export async function getUserBusinessRole(input: {
  userId: string;
  businessId: string;
}): Promise<BusinessMembershipRole | null> {
  try {
    const database = getDatabase();
    const [membership] = await database
      .select({
        role: businessMembership.role,
        status: businessMembership.status,
      })
      .from(businessMembership)
      .where(
        and(
          eq(businessMembership.userId, input.userId),
          eq(businessMembership.businessId, input.businessId),
          eq(businessMembership.status, "active"),
        ),
      )
      .limit(1);

    return membership && isBusinessMembershipRole(membership.role)
      ? membership.role
      : null;
  } catch {
    return null;
  }
}

export async function canUserAccessBusiness(input: {
  userId: string;
  businessId: string;
  permission: BusinessPermission;
}): Promise<boolean> {
  try {
    const database = getDatabase();
    const [membership] = await database
      .select({
        role: businessMembership.role,
        permissions: businessMembership.permissions,
        status: businessMembership.status,
      })
      .from(businessMembership)
      .where(
        and(
          eq(businessMembership.userId, input.userId),
          eq(businessMembership.businessId, input.businessId),
        ),
      )
      .limit(1);

    return canMembershipPerform(membership ?? null, input.permission);
  } catch {
    return false;
  }
}

/**
 * Resolves several permissions for one user with a single membership lookup.
 * Applies the same `canMembershipPerform` rule as `canUserAccessBusiness`, and
 * denies everything on any failure.
 */
export async function getUserBusinessPermissions<
  const Permission extends BusinessPermission,
>(input: {
  userId: string;
  businessId: string;
  permissions: readonly Permission[];
}): Promise<Record<Permission, boolean>> {
  let membership: {
    role: string;
    permissions: string[];
    status: string;
  } | null = null;
  try {
    const database = getDatabase();
    [membership = null] = await database
      .select({
        role: businessMembership.role,
        permissions: businessMembership.permissions,
        status: businessMembership.status,
      })
      .from(businessMembership)
      .where(
        and(
          eq(businessMembership.userId, input.userId),
          eq(businessMembership.businessId, input.businessId),
        ),
      )
      .limit(1);
  } catch {
    membership = null;
  }

  return Object.fromEntries(
    input.permissions.map((permission) => [
      permission,
      canMembershipPerform(membership, permission),
    ]),
  ) as Record<Permission, boolean>;
}
