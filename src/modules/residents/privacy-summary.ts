import "server-only";
import { and, count, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessMembership } from "@/lib/database/schema/business";
import { businessReview } from "@/lib/database/schema/business-reviews";
import { contentReport } from "@/lib/database/schema/moderation";
import { notification } from "@/lib/database/schema/notification";
import {
  savedBusiness,
  savedEvent,
  savedPlace,
} from "@/lib/database/schema/saved-discovery";
import { savedSearch } from "@/lib/database/schema/saved-search";

/** What the site holds about one signed-in person, as counts. */
export type PrivacyHoldings = {
  savedBusinesses: number;
  mutedBusinesses: number;
  savedEvents: number;
  savedPlaces: number;
  savedSearches: number;
  notifications: number;
  reviews: number;
  reportsFiled: number;
  businessRoles: number;
};

export type PrivacySummary =
  { state: "ready"; holdings: PrivacyHoldings } | { state: "unavailable" };

/**
 * Counts, for the signed-in person only, each kind of personal data the site
 * stores. Every query is scoped to `userId`; nothing about anyone else is read.
 */
export async function readPrivacySummary(
  userId: string,
): Promise<PrivacySummary> {
  try {
    const database = getDatabase();
    const one = async (query: Promise<Array<{ total: number }>>) =>
      (await query)[0]?.total ?? 0;
    const [
      savedBusinesses,
      mutedBusinesses,
      savedEvents,
      savedPlaces,
      savedSearches,
      notifications,
      reviews,
      reportsFiled,
      businessRoles,
    ] = await Promise.all([
      one(
        database
          .select({ total: count() })
          .from(savedBusiness)
          .where(eq(savedBusiness.userId, userId)),
      ),
      one(
        database
          .select({ total: count() })
          .from(savedBusiness)
          .where(
            and(
              eq(savedBusiness.userId, userId),
              eq(savedBusiness.notify, false),
            ),
          ),
      ),
      one(
        database
          .select({ total: count() })
          .from(savedEvent)
          .where(eq(savedEvent.userId, userId)),
      ),
      one(
        database
          .select({ total: count() })
          .from(savedPlace)
          .where(eq(savedPlace.userId, userId)),
      ),
      one(
        database
          .select({ total: count() })
          .from(savedSearch)
          .where(eq(savedSearch.userId, userId)),
      ),
      one(
        database
          .select({ total: count() })
          .from(notification)
          .where(eq(notification.userId, userId)),
      ),
      one(
        database
          .select({ total: count() })
          .from(businessReview)
          .where(eq(businessReview.userId, userId)),
      ),
      one(
        database
          .select({ total: count() })
          .from(contentReport)
          .where(eq(contentReport.reporterUserId, userId)),
      ),
      one(
        database
          .select({ total: count() })
          .from(businessMembership)
          .where(eq(businessMembership.userId, userId)),
      ),
    ]);
    return {
      state: "ready",
      holdings: {
        savedBusinesses,
        mutedBusinesses,
        savedEvents,
        savedPlaces,
        savedSearches,
        notifications,
        reviews,
        reportsFiled,
        businessRoles,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
