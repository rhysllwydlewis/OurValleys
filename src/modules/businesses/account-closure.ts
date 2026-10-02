import "server-only";
import { and, eq, ne, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDatabase } from "@/lib/database/client";
import { business, businessMembership } from "@/lib/database/schema/business";

export type SoleOwnedBusiness = { id: string; tradingName: string };

/**
 * Businesses where the user is the only active owner. Deleting the account
 * would leave these with nobody able to manage them, so closure is refused
 * until ownership is transferred or another owner is added (OV-205).
 */
export async function listSoleOwnedBusinesses(
  userId: string,
): Promise<SoleOwnedBusiness[]> {
  const database = getDatabase();
  const otherOwner = alias(businessMembership, "other_owner");

  return database
    .select({ id: business.id, tradingName: business.tradingName })
    .from(businessMembership)
    .innerJoin(business, eq(business.id, businessMembership.businessId))
    .where(
      and(
        eq(businessMembership.userId, userId),
        eq(businessMembership.role, "owner"),
        eq(businessMembership.status, "active"),
        notExists(
          database
            .select({ id: otherOwner.id })
            .from(otherOwner)
            .where(
              and(
                eq(otherOwner.businessId, businessMembership.businessId),
                eq(otherOwner.role, "owner"),
                eq(otherOwner.status, "active"),
                ne(otherOwner.userId, userId),
              ),
            ),
        ),
      ),
    )
    .orderBy(business.tradingName);
}
