import "server-only";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessMembership } from "@/lib/database/schema/business";

export const businessPermissions = {
  view: "business.view",
  editProfile: "business.edit_profile",
  publish: "business.publish",
} as const;

export type BusinessPermission =
  (typeof businessPermissions)[keyof typeof businessPermissions];

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

    if (!membership || membership.status !== "active") return false;
    if (membership.role === "owner") return true;
    return membership.permissions.includes(input.permission);
  } catch {
    return false;
  }
}
