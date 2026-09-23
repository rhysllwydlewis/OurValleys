import "server-only";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  place,
} from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { businessReview } from "@/lib/database/schema/business-reviews";
import { contentReport } from "@/lib/database/schema/moderation";
import {
  savedBusiness,
  savedEvent,
  savedPlace,
} from "@/lib/database/schema/saved-discovery";

const identifierSchema = z.uuid();

export type UserDataExport = {
  exportedAt: string;
  profile: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    marketingOptIn: boolean;
    savedEventCancellationEmails: boolean;
    createdAt: string;
  };
  savedBusinesses: Array<{
    businessId: string;
    tradingName: string;
    slug: string;
    savedAt: string;
  }>;
  savedEvents: Array<{
    eventId: string;
    title: string;
    businessName: string;
    savedAt: string;
  }>;
  savedPlaces: Array<{
    placeId: string;
    name: string;
    slug: string;
    savedAt: string;
  }>;
  reviews: Array<{
    id: string;
    businessId: string;
    businessName: string;
    rating: number;
    body: string | null;
    status: string;
    createdAt: string;
  }>;
  businessMemberships: Array<{
    businessId: string;
    businessName: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
  businessesCreated: Array<{
    businessId: string;
    tradingName: string;
    slug: string;
    createdAt: string;
  }>;
  contentReportsFiled: Array<{
    id: string;
    targetType: "business" | "review" | "event";
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
  }>;
};

/**
 * Assembles the personal data OurValleys holds about a resident, for the
 * self-service data portability control in account settings (UK GDPR
 * portability right, docs/07-trust-safety-privacy-legal.md).
 */
export async function buildUserDataExport(
  userId: string,
): Promise<UserDataExport | null> {
  const parsedUserId = identifierSchema.safeParse(userId);
  if (!parsedUserId.success) return null;
  const id = parsedUserId.data;
  const database = getDatabase();

  const [
    profileRows,
    savedBusinessRows,
    savedEventRows,
    savedPlaceRows,
    reviewRows,
    membershipRows,
    createdBusinessRows,
    reportRows,
  ] = await Promise.all([
    database
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        marketingOptIn: user.marketingOptIn,
        savedEventCancellationEmails: user.savedEventCancellationEmails,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1),
    database
      .select({
        businessId: business.id,
        tradingName: business.tradingName,
        slug: business.slug,
        savedAt: savedBusiness.createdAt,
      })
      .from(savedBusiness)
      .innerJoin(business, eq(business.id, savedBusiness.businessId))
      .where(eq(savedBusiness.userId, id))
      .orderBy(desc(savedBusiness.createdAt)),
    database
      .select({
        eventId: businessEvent.id,
        title: businessEvent.title,
        businessName: business.tradingName,
        savedAt: savedEvent.createdAt,
      })
      .from(savedEvent)
      .innerJoin(businessEvent, eq(businessEvent.id, savedEvent.eventId))
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .where(eq(savedEvent.userId, id))
      .orderBy(desc(savedEvent.createdAt)),
    database
      .select({
        placeId: place.id,
        name: place.canonicalName,
        slug: place.slug,
        savedAt: savedPlace.createdAt,
      })
      .from(savedPlace)
      .innerJoin(place, eq(place.id, savedPlace.placeId))
      .where(eq(savedPlace.userId, id))
      .orderBy(desc(savedPlace.createdAt)),
    database
      .select({
        id: businessReview.id,
        businessId: businessReview.businessId,
        businessName: business.tradingName,
        rating: businessReview.rating,
        body: businessReview.body,
        status: businessReview.status,
        createdAt: businessReview.createdAt,
      })
      .from(businessReview)
      .innerJoin(business, eq(business.id, businessReview.businessId))
      .where(eq(businessReview.userId, id))
      .orderBy(desc(businessReview.createdAt)),
    database
      .select({
        businessId: business.id,
        businessName: business.tradingName,
        role: businessMembership.role,
        status: businessMembership.status,
        createdAt: businessMembership.createdAt,
      })
      .from(businessMembership)
      .innerJoin(business, eq(business.id, businessMembership.businessId))
      .where(eq(businessMembership.userId, id))
      .orderBy(desc(businessMembership.createdAt)),
    database
      .select({
        businessId: business.id,
        tradingName: business.tradingName,
        slug: business.slug,
        createdAt: business.createdAt,
      })
      .from(business)
      .where(eq(business.createdByUserId, id))
      .orderBy(desc(business.createdAt)),
    database
      .select({
        id: contentReport.id,
        businessId: contentReport.businessId,
        reviewId: contentReport.reviewId,
        eventId: contentReport.eventId,
        reason: contentReport.reason,
        details: contentReport.details,
        status: contentReport.status,
        createdAt: contentReport.createdAt,
      })
      .from(contentReport)
      .where(eq(contentReport.reporterUserId, id))
      .orderBy(desc(contentReport.createdAt)),
  ]);

  const profileRow = profileRows[0];
  if (!profileRow) return null;

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: profileRow.id,
      name: profileRow.name,
      email: profileRow.email,
      emailVerified: profileRow.emailVerified,
      marketingOptIn: profileRow.marketingOptIn,
      savedEventCancellationEmails: profileRow.savedEventCancellationEmails,
      createdAt: profileRow.createdAt.toISOString(),
    },
    savedBusinesses: savedBusinessRows.map((row) => ({
      ...row,
      savedAt: row.savedAt.toISOString(),
    })),
    savedEvents: savedEventRows.map((row) => ({
      ...row,
      savedAt: row.savedAt.toISOString(),
    })),
    savedPlaces: savedPlaceRows.map((row) => ({
      ...row,
      savedAt: row.savedAt.toISOString(),
    })),
    reviews: reviewRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    businessMemberships: membershipRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    businessesCreated: createdBusinessRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    contentReportsFiled: reportRows.map((row) => ({
      id: row.id,
      targetType: row.businessId
        ? ("business" as const)
        : row.reviewId
          ? ("review" as const)
          : ("event" as const),
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
