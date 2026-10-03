import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business, businessMembership } from "@/lib/database/schema/business";

export type SoleOwnedBusiness = { id: string; tradingName: string };

/**
 * Account closure safeguard (OV-205). Inside one transaction this locks the
 * owner memberships of every live business the user owns, so concurrent
 * closures and the team removal/role-change paths (which lock the same rows)
 * serialise. If the user is the only active owner of any business, nothing is
 * changed and those businesses are returned. Otherwise the user's own
 * memberships are released in the same transaction, so a second co-owner who
 * then closes their account sees the first one gone and is refused.
 *
 * A suspended owner membership still counts as ownership (an administrator can
 * reactivate it); removed memberships and removed businesses do not.
 */
export async function releaseMembershipsForAccountClosure(
  userId: string,
): Promise<SoleOwnedBusiness[]> {
  return getDatabase().transaction(async (transaction) => {
    const owned = await transaction
      .select({
        businessId: businessMembership.businessId,
        tradingName: business.tradingName,
      })
      .from(businessMembership)
      .innerJoin(business, eq(business.id, businessMembership.businessId))
      .where(
        and(
          eq(businessMembership.userId, userId),
          eq(businessMembership.role, "owner"),
          inArray(businessMembership.status, ["active", "suspended"]),
          ne(business.status, "removed"),
        ),
      );
    const businessIds = owned.map((row) => row.businessId);

    if (businessIds.length > 0) {
      const owners = await transaction
        .select({
          businessId: businessMembership.businessId,
          userId: businessMembership.userId,
        })
        .from(businessMembership)
        .where(
          and(
            inArray(businessMembership.businessId, businessIds),
            eq(businessMembership.role, "owner"),
            eq(businessMembership.status, "active"),
          ),
        )
        // Stable order avoids lock-order deadlocks between closing owners.
        .orderBy(asc(businessMembership.id))
        .for("update");

      const blocked = new Map<string, SoleOwnedBusiness>();
      for (const { businessId, tradingName } of owned) {
        const hasOtherOwner = owners.some(
          (row) => row.businessId === businessId && row.userId !== userId,
        );
        if (!hasOtherOwner) {
          blocked.set(businessId, { id: businessId, tradingName });
        }
      }
      if (blocked.size > 0) return [...blocked.values()];
    }

    await transaction
      .delete(businessMembership)
      .where(eq(businessMembership.userId, userId));
    return [];
  });
}
