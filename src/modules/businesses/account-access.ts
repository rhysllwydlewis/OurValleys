import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business, businessMembership } from "@/lib/database/schema/business";
import {
  businessPermissions,
  canMembershipPerform,
} from "@/modules/identity/access-policy";

export type AccessibleBusiness = {
  id: string;
  tradingName: string;
  role: string;
  isDemo: boolean;
};

export async function listAccessibleBusinesses(
  userId: string,
): Promise<AccessibleBusiness[]> {
  const database = getDatabase();
  const memberships = await database
    .select({
      id: business.id,
      tradingName: business.tradingName,
      role: businessMembership.role,
      permissions: businessMembership.permissions,
      status: businessMembership.status,
      isDemo: business.isDemo,
    })
    .from(businessMembership)
    .innerJoin(business, eq(business.id, businessMembership.businessId))
    .where(
      and(
        eq(businessMembership.userId, userId),
        eq(businessMembership.status, "active"),
      ),
    )
    .orderBy(asc(business.tradingName));

  return memberships
    .filter((membership) =>
      canMembershipPerform(membership, businessPermissions.view),
    )
    .map(({ id, tradingName, role, isDemo }) => ({
      id,
      tradingName,
      role,
      isDemo,
    }));
}
