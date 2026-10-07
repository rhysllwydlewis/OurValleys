import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { parseAnalyticsPeriod } from "@/modules/businesses/analytics";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  enquiryStatuses,
  type EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  businessPermissions,
  canUserAccessBusiness,
  getUserBusinessPermissions,
} from "@/modules/businesses/permissions";
import styles from "./operations.module.css";
import { AnalyticsSection } from "./sections/analytics-section";
import { CategorySectionsSection } from "./sections/category-sections-section";
import { EntitlementSection } from "./sections/entitlement-section";
import { EventsSection } from "./sections/events-section";
import { MenuSection } from "./sections/menu-section";
import { OffersSection } from "./sections/offers-section";
import { ReviewsSection } from "./sections/reviews-section";
import { InboxSection } from "./sections/inbox-section";
import { LifecycleSection } from "./sections/lifecycle-section";
import { OpeningHoursLoader } from "./sections/opening-hours-loader";
import { ContactsSection } from "./sections/contacts-section";
import { SectionSkeleton } from "./sections/shared";
import { TeamSection } from "./sections/team-section";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Operate your business website",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    outcome?: string;
    enquiryStatus?: string;
    enquiryPage?: string;
    period?: string;
  }>;
};

const outcomeMessages: Record<string, string> = {
  "contact-saved": "Contact method saved.",
  removed: "Item removed safely.",
  updated: "Status updated.",
  "offer-saved": "Offer saved.",
  "event-saved": "Event saved.",
  "series-cancelled":
    "All upcoming dates in the series are cancelled. Residents who saved them have been notified.",
  not_series: "That event is not part of a repeating series.",
  "hours-saved": "Opening hours saved. The change is live.",
  "special-day-saved": "Special day saved. The change is live.",
  "special-day-removed": "Special day removed.",
  no_location:
    "Opening hours can be changed here once your business is published.",
  limit: "There are too many upcoming special days. Remove some and try again.",
  not_found: "That special day no longer exists.",
  "menu-saved": "Menu updated.",
  "section-saved": "Category section saved.",
  "document-saved": "Menu document uploaded.",
  "terms-accepted": "The current business website terms have been accepted.",
  "auto-publish-updated": "Automatic publication preference updated.",
  "lifecycle-emails-updated": "Reminder email preference updated.",
  "enquiry-deleted": "Enquiry deleted.",
  "enquiry-replied": "Your reply has been sent.",
  no_email: "This enquiry has no email address to reply to.",
  rate_limited:
    "Too many replies have been sent for this business recently. Try again shortly.",
  confirmed: "Trading status confirmed for another 12 months.",
  locked:
    "A moderator removed this event, so it can no longer be changed or deleted. Contact support if you think this was a mistake.",
  invalid: "Check the submitted information and try again.",
  forbidden: "Your membership does not permit that action.",
  unavailable: "That action is temporarily unavailable. Nothing was changed.",
  storage_unavailable: "Document storage is not configured yet.",
  "invitation-sent": "Invitation sent.",
  "invitation-revoked": "Invitation revoked.",
  "member-removed": "Team member removed.",
  "role-updated": "Team member role updated.",
  "review-response-saved": "Your response has been posted.",
  "review-response-removed": "Your response has been removed.",
  already_member: "That person is already an active team member.",
  invitation_pending: "An invitation to that email is already pending.",
  last_owner: "At least one owner must remain on the team.",
  "team-joined": "You have joined the team for this business.",
};

export default async function BusinessOperationsPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) redirect("/login?next=/account");

  const { businessId } = await params;
  if (!z.uuid().safeParse(businessId).success) notFound();
  const canView = await canUserAccessBusiness({
    userId: session.user.id,
    businessId,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  const { outcome, enquiryStatus, enquiryPage, period } = await searchParams;
  const analyticsPeriodDays = parseAnalyticsPeriod(period);
  const enquiryStatusFilter = (enquiryStatuses as readonly string[]).includes(
    enquiryStatus ?? "",
  )
    ? (enquiryStatus as EnquiryStatus)
    : undefined;
  const enquiryPageNumber = Math.max(1, Number(enquiryPage ?? 1) || 1);

  const [permissions, memberships] = await Promise.all([
    getUserBusinessPermissions({
      userId: session.user.id,
      businessId,
      permissions: [
        businessPermissions.manageContacts,
        businessPermissions.manageEnquiries,
        businessPermissions.manageContent,
        businessPermissions.manageLifecycle,
        businessPermissions.publish,
        businessPermissions.viewAnalytics,
        businessPermissions.manageMembers,
        businessPermissions.editProfile,
      ],
    }),
    listAccessibleBusinesses(session.user.id),
  ]);
  const canContacts = permissions[businessPermissions.manageContacts];
  const canEnquiries = permissions[businessPermissions.manageEnquiries];
  const canContent = permissions[businessPermissions.manageContent];
  const canLifecycle = permissions[businessPermissions.manageLifecycle];
  const canPublish = permissions[businessPermissions.publish];
  const canAnalytics = permissions[businessPermissions.viewAnalytics];
  const canManageMembers = permissions[businessPermissions.manageMembers];
  const canEditProfile = permissions[businessPermissions.editProfile];
  const businessSummary = memberships.find((item) => item.id === businessId);
  if (!businessSummary) notFound();
  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <nav aria-label="Breadcrumb">
          <Link href={`/dashboard/business/${businessId}` as Route}>
            ← Business dashboard
          </Link>
        </nav>
        <header className={styles.hero}>
          <p className="eyebrow">Business operations</p>
          <h1>{businessSummary.tradingName}</h1>
          <p className="lead">
            Manage how customers contact you, respond to enquiries, publish
            timely content, keep the website current and understand simple
            results.
          </p>
        </header>
        <div className={styles.toolbar}>
          <Link
            className="button"
            href={`/dashboard/business/${businessId}/preview` as Route}
          >
            Preview website
          </Link>
          <Link className="button" href={`/b/${businessSummary.slug}` as Route}>
            Open published website
          </Link>
          <Link
            className="button"
            href={`/b/${businessSummary.slug}/qr` as Route}
          >
            QR code
          </Link>
        </div>
        {outcome && outcomeMessages[outcome] ? (
          <p className={styles.notice} role="status">
            {outcomeMessages[outcome]}
          </p>
        ) : null}

        <Suspense fallback={<SectionSkeleton id="team" title="Team" />}>
          <TeamSection
            businessId={businessId}
            canManageMembers={canManageMembers}
          />
        </Suspense>

        <Suspense
          fallback={<SectionSkeleton id="contacts" title="Contact methods" />}
        >
          <ContactsSection businessId={businessId} canContacts={canContacts} />
        </Suspense>

        <Suspense
          fallback={<SectionSkeleton id="inbox" title="Customer enquiries" />}
        >
          <InboxSection
            businessId={businessId}
            canEnquiries={canEnquiries}
            enquiryStatusFilter={enquiryStatusFilter}
            enquiryPageNumber={enquiryPageNumber}
          />
        </Suspense>

        <Suspense
          fallback={<SectionSkeleton id="offers" title="Special offers" />}
        >
          <OffersSection businessId={businessId} canContent={canContent} />
        </Suspense>

        <Suspense
          fallback={<SectionSkeleton id="hours" title="Opening hours" />}
        >
          <OpeningHoursLoader
            businessId={businessId}
            canEdit={canEditProfile}
          />
        </Suspense>

        <Suspense fallback={<SectionSkeleton id="events" title="Events" />}>
          <EventsSection businessId={businessId} canContent={canContent} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton id="menu" title="Menu" />}>
          <MenuSection businessId={businessId} canContent={canContent} />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="category-sections"
              title="Additional structured sections"
            />
          }
        >
          <CategorySectionsSection
            businessId={businessId}
            canContent={canContent}
          />
        </Suspense>

        <Suspense fallback={<SectionSkeleton id="reviews" title="Reviews" />}>
          <ReviewsSection businessId={businessId} canContent={canContent} />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton id="lifecycle" title="Publication and lifecycle" />
          }
        >
          <LifecycleSection
            businessId={businessId}
            canPublish={canPublish}
            canLifecycle={canLifecycle}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton id="analytics" title="Promotion and insight" />
          }
        >
          <AnalyticsSection
            businessId={businessId}
            businessSlug={businessSummary.slug}
            periodDays={analyticsPeriodDays}
            canAnalytics={canAnalytics}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="entitlement"
              title="Permanent free entitlement"
            />
          }
        >
          <EntitlementSection businessId={businessId} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
