import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  businessEnquiry,
  businessLifecycle,
} from "@/lib/database/schema/business-operations";
import {
  getBusinessAnalyticsSummary,
  getBusinessDailyActivity,
  type BusinessAnalyticsSummary,
  type DailyActivityPoint,
} from "./analytics";
import { countOpenOwnerCorrections } from "./corrections";
import { listBusinessContactMethods } from "./contacts-and-enquiries";
import { listBusinessEvents, listBusinessOffers } from "./content-features";
import { listBusinessMedia } from "./media";
import type { OwnerHubFacts } from "./owner-hub";

const DAY_MS = 24 * 60 * 60 * 1000;
export const OWNER_HUB_PERIOD_DAYS = 30;

export type OwnerHubData = {
  facts: Omit<
    OwnerHubFacts,
    | "status"
    | "canEdit"
    | "canPublish"
    | "canOperate"
    | "canDesign"
    | "setupKnown"
    | "missingSetupSteps"
  >;
  /** `null` when the caller may not see analytics (nothing was read). */
  analytics: {
    summary: BusinessAnalyticsSummary;
    daily: DailyActivityPoint[];
  } | null;
};

type WaitingEnquiries = { count: number; oldestDays: number };

async function readWaitingEnquiries(
  businessId: string,
  now: Date,
): Promise<WaitingEnquiries> {
  try {
    const [row] = await getDatabase()
      .select({
        count: sql<number>`count(*)::int`,
        oldest: sql<Date | null>`min(${businessEnquiry.submittedAt})`,
      })
      .from(businessEnquiry)
      .where(
        and(
          eq(businessEnquiry.businessId, businessId),
          inArray(businessEnquiry.status, ["new", "read"]),
        ),
      );
    const oldest = row?.oldest ? new Date(row.oldest) : null;
    return {
      count: row?.count ?? 0,
      oldestDays: oldest
        ? Math.max(0, Math.floor((now.getTime() - oldest.getTime()) / DAY_MS))
        : 0,
    };
  } catch {
    return { count: 0, oldestDays: 0 };
  }
}

async function readDigestEnabled(businessId: string): Promise<boolean> {
  try {
    const [row] = await getDatabase()
      .select({ enabled: businessLifecycle.weeklyDigestEnabled })
      .from(businessLifecycle)
      .where(eq(businessLifecycle.businessId, businessId))
      .limit(1);
    return row?.enabled ?? false;
  } catch {
    return false;
  }
}

/**
 * Everything the owner hub reads that is not already loaded by the dashboard.
 * Every reader fails soft (empty or zero) so a slow or failing table never
 * takes the hub down. The caller has already authorised the viewer for this
 * business; this module checks nothing about people.
 */
export async function loadOwnerHubData(
  businessId: string,
  now = new Date(),
  options: { includeAnalytics?: boolean } = {},
): Promise<OwnerHubData> {
  const includeAnalytics = options.includeAnalytics ?? true;
  const [
    waiting,
    contacts,
    media,
    offers,
    events,
    digestEnabled,
    correctionsWaiting,
    summary,
    daily,
  ] = await Promise.all([
    readWaitingEnquiries(businessId, now),
    listBusinessContactMethods(businessId),
    listBusinessMedia(businessId),
    listBusinessOffers(businessId, true),
    listBusinessEvents(businessId, true),
    readDigestEnabled(businessId),
    countOpenOwnerCorrections(businessId),
    includeAnalytics
      ? getBusinessAnalyticsSummary(businessId, OWNER_HUB_PERIOD_DAYS)
      : null,
    includeAnalytics
      ? getBusinessDailyActivity(businessId, OWNER_HUB_PERIOD_DAYS)
      : null,
  ]);

  const upcoming = events.filter(
    (event) => (event.endsAt ?? event.startsAt).getTime() >= now.getTime(),
  );

  return {
    facts: {
      enquiriesWaiting: waiting.count,
      oldestEnquiryWaitDays: waiting.oldestDays,
      correctionsWaiting,
      // Disabled methods are not shown publicly, so they do not count.
      contactMethodCount: contacts.filter((method) => method.enabled).length,
      hasLogo: media.logo !== null,
      galleryCount: media.gallery.length,
      activeOfferCount: offers.length,
      upcomingEventCount: upcoming.length,
      weeklyDigestEnabled: digestEnabled,
    },
    analytics: summary && daily ? { summary, daily } : null,
  };
}
