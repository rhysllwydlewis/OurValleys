import "server-only";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessMembership } from "@/lib/database/schema/business";
import {
  businessPermissions,
  canMembershipPerform,
  type BusinessPermission,
} from "@/modules/identity/access-policy";

export { businessPermissions, type BusinessPermission };

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
