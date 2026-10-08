import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getAuth } from "@/lib/auth";
import { areReviewsEnabled } from "@/lib/reviews-flag";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { parseAnalyticsPeriod } from "@/modules/businesses/analytics";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  enquiryStatuses,
  type EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  businessPermissions,
  canUserAccessBusiness,
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
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("ops.metaTitle"),
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{
    outcome?: string;
    enquiryStatus?: string;
    enquiryPage?: string;
    period?: string;
  }>;
};

const outcomeMessages = {
  "contact-saved": "ops.outcome.contactSaved",
  removed: "ops.outcome.removed",
  updated: "ops.outcome.updated",
  "offer-saved": "ops.outcome.offerSaved",
  "event-saved": "ops.outcome.eventSaved",
  "series-cancelled": "ops.outcome.seriesCancelled",
  not_series: "ops.outcome.notSeries",
  "hours-saved": "ops.outcome.hoursSaved",
  "special-day-saved": "ops.outcome.specialDaySaved",
  "special-day-removed": "ops.outcome.specialDayRemoved",
  no_location: "ops.outcome.noLocation",
  limit: "ops.outcome.limit",
  not_found: "ops.outcome.notFound",
  "menu-saved": "ops.outcome.menuSaved",
  "section-saved": "ops.outcome.sectionSaved",
  "document-saved": "ops.outcome.documentSaved",
  "terms-accepted": "ops.outcome.termsAccepted",
  "auto-publish-updated": "ops.outcome.autoPublishUpdated",
  "lifecycle-emails-updated": "ops.outcome.lifecycleEmailsUpdated",
  "enquiry-deleted": "ops.outcome.enquiryDeleted",
  "enquiry-replied": "ops.outcome.enquiryReplied",
  no_email: "ops.outcome.noEmail",
  rate_limited: "ops.outcome.rateLimited",
  confirmed: "ops.outcome.confirmed",
  locked: "ops.outcome.locked",
  invalid: "ops.outcome.invalid",
  forbidden: "ops.outcome.forbidden",
  unavailable: "ops.outcome.unavailable",
  storage_unavailable: "ops.outcome.storageUnavailable",
  "invitation-sent": "ops.outcome.invitationSent",
  "invitation-revoked": "ops.outcome.invitationRevoked",
  "member-removed": "ops.outcome.memberRemoved",
  "role-updated": "ops.outcome.roleUpdated",
  "review-response-saved": "ops.outcome.reviewResponseSaved",
  "review-response-removed": "ops.outcome.reviewResponseRemoved",
  already_member: "ops.outcome.alreadyMember",
  invitation_pending: "ops.outcome.invitationPending",
  last_owner: "ops.outcome.lastOwner",
  "team-joined": "ops.outcome.teamJoined",
  "image-invalid": "ops.outcome.imageInvalid",
  "image-limit": "ops.outcome.imageLimit",
  "image-storage": "ops.outcome.imageStorage",
} as const satisfies Record<string, MessageKey>;

export default async function BusinessOperationsPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, t } = await getTranslator();
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

  const memberships = await listAccessibleBusinesses(session.user.id);
  const businessSummary = memberships.find((item) => item.id === businessId);
  if (!businessSummary) notFound();
  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
        <nav aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${businessId}` as Route}>
            {t("ops.back")}
          </Link>
        </nav>
        <header className={styles.hero}>
          <p className="eyebrow">{t("ops.hero.eyebrow")}</p>
          <h1 lang={authoredTextLang}>{businessSummary.tradingName}</h1>
          <p className="lead">{t("ops.hero.lead")}</p>
        </header>
        <div className={styles.toolbar}>
          <Link
            className="button"
            href={`/dashboard/business/${businessId}/preview` as Route}
          >
            {t("ops.tool.preview")}
          </Link>
          <Link className="button" href={`/b/${businessSummary.slug}` as Route}>
            {t("ops.tool.open")}
          </Link>
          <Link
            className="button"
            href={`/b/${businessSummary.slug}/qr` as Route}
          >
            {t("ops.tool.qr")}
          </Link>
        </div>
        {outcome && Object.hasOwn(outcomeMessages, outcome) ? (
          <p className={styles.notice} role="status">
            {t(outcomeMessages[outcome as keyof typeof outcomeMessages])}
          </p>
        ) : null}

        <Suspense
          fallback={
            <SectionSkeleton
              id="team"
              title={t("ops.team.eyebrow")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <TeamSection businessId={businessId} userId={session.user.id} />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="contacts"
              title={t("ops.contacts.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <ContactsSection businessId={businessId} userId={session.user.id} />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="inbox"
              title={t("ops.inbox.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <InboxSection
            businessId={businessId}
            userId={session.user.id}
            enquiryStatusFilter={enquiryStatusFilter}
            enquiryPageNumber={enquiryPageNumber}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="offers"
              title={t("ops.offers.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <OffersSection businessId={businessId} userId={session.user.id} />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="hours"
              title={t("ops.hours.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <OpeningHoursLoader
            businessId={businessId}
            userId={session.user.id}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="events"
              title={t("ops.events.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <EventsSection businessId={businessId} userId={session.user.id} />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="menu"
              title={t("ops.menu.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <MenuSection businessId={businessId} userId={session.user.id} />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="category-sections"
              title={t("ops.sections.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <CategorySectionsSection
            businessId={businessId}
            userId={session.user.id}
          />
        </Suspense>

        {areReviewsEnabled() ? (
          <Suspense
            fallback={
              <SectionSkeleton
                id="reviews"
                title={t("ops.reviews.title")}
                loadingText={t("ops.loading")}
              />
            }
          >
            <ReviewsSection businessId={businessId} userId={session.user.id} />
          </Suspense>
        ) : null}

        <Suspense
          fallback={
            <SectionSkeleton
              id="lifecycle"
              title={t("ops.life.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <LifecycleSection businessId={businessId} userId={session.user.id} />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="analytics"
              title={t("ops.analytics.title")}
              loadingText={t("ops.loading")}
            />
          }
        >
          <AnalyticsSection
            businessId={businessId}
            businessSlug={businessSummary.slug}
            periodDays={analyticsPeriodDays}
            userId={session.user.id}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionSkeleton
              id="entitlement"
              title={t("ops.entitlement.title")}
              loadingText={t("ops.loading")}
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
