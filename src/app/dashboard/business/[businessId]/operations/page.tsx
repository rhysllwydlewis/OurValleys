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
  countStaleUnansweredEnquiries,
  ENQUIRY_STALE_AFTER_DAYS,
  enquiryStatuses,
  enquiryWaitingDays,
  listBusinessEnquiriesPage,
  type EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  ensureBusinessLifecycle,
  getAutomaticPublicationEligibility,
} from "@/modules/businesses/lifecycle-automation";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { getOwnerOpeningHours } from "@/modules/businesses/opening-hours";
import { upcomingBankHolidays } from "@/modules/businesses/bank-holidays";
import { londonDateString } from "@/modules/businesses/opening-hours-exceptions";
import { OpeningHoursSection } from "./opening-hours-section";
import styles from "./operations.module.css";
import { AnalyticsSection } from "./sections/analytics-section";
import { CategorySectionsSection } from "./sections/category-sections-section";
import { EntitlementSection } from "./sections/entitlement-section";
import { EventsSection } from "./sections/events-section";
import { MenuSection } from "./sections/menu-section";
import { OffersSection } from "./sections/offers-section";
import { ReviewsSection } from "./sections/reviews-section";
import { ContactsSection } from "./sections/contacts-section";
import { SectionSkeleton, formatDate, hidden } from "./sections/shared";
import { TeamSection } from "./sections/team-section";
import {
  acceptTermsAction,
  configureAutoPublishAction,
  configureLifecycleEmailsAction,
  confirmTradingAction,
  deleteEnquiryAction,
  lifecycleAction,
  postponeAutoPublishAction,
  removeReviewResponseAction,
  replyToEnquiryAction,
  respondToReviewAction,
  updateEnquiryAction,
} from "./actions";

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

  const [
    canContacts,
    canEnquiries,
    canContent,
    canLifecycle,
    canPublish,
    canAnalytics,
    canManageMembers,
    canEditProfile,
    memberships,
    enquiryResult,
    lifecycle,
    eligibility,
    openingHours,
    staleUnansweredCount,
  ] = await Promise.all([
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageContacts,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageEnquiries,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageContent,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageLifecycle,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.publish,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.viewAnalytics,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageMembers,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.editProfile,
    }),
    listAccessibleBusinesses(session.user.id),
    listBusinessEnquiriesPage(businessId, {
      status: enquiryStatusFilter,
      page: enquiryPageNumber,
    }),
    ensureBusinessLifecycle(businessId),
    getAutomaticPublicationEligibility(businessId),
    getOwnerOpeningHours(businessId),
    countStaleUnansweredEnquiries(businessId),
  ]);
  const businessSummary = memberships.find((item) => item.id === businessId);
  if (!businessSummary) notFound();
  const {
    enquiries,
    total: enquiryTotal,
    hasNextPage: hasMoreEnquiries,
  } = enquiryResult;
  const waitingNow = new Date();
  const waitingLabel = (enquiry: (typeof enquiries)[number]) => {
    const days = enquiryWaitingDays(enquiry, waitingNow);
    if (days === null || days < 1) return "";
    return `waiting ${days} day${days === 1 ? "" : "s"}`;
  };

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

        <section
          className={styles.section}
          id="inbox"
          aria-labelledby="inbox-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Protected inbox</p>
              <h2 id="inbox-title">Customer enquiries</h2>
            </div>
            <p className={styles.meta}>
              {enquiryTotal} retained message
              {enquiryTotal === 1 ? "" : "s"}
            </p>
          </div>
          {canEnquiries && staleUnansweredCount > 0 ? (
            <p className={styles.notice} role="status">
              {staleUnansweredCount} enquir
              {staleUnansweredCount === 1 ? "y has" : "ies have"} waited more
              than {ENQUIRY_STALE_AFTER_DAYS} days for a reply. A quick answer,
              even a short one, helps people decide to trust your business.
            </p>
          ) : null}
          <div className={styles.toolbar}>
            <Link
              href={
                `/dashboard/business/${businessId}/operations#inbox` as Route
              }
              aria-current={!enquiryStatusFilter ? "page" : undefined}
              className="button"
            >
              All
            </Link>
            {enquiryStatuses.map((status) => (
              <Link
                key={status}
                href={
                  `/dashboard/business/${businessId}/operations?enquiryStatus=${status}#inbox` as Route
                }
                aria-current={
                  enquiryStatusFilter === status ? "page" : undefined
                }
                className="button"
              >
                {status}
              </Link>
            ))}
            {canEnquiries ? (
              <a
                className="button"
                href={`/dashboard/business/${businessId}/operations/enquiries/export${enquiryStatusFilter ? `?status=${enquiryStatusFilter}` : ""}`}
              >
                Export CSV
              </a>
            ) : null}
          </div>
          {enquiries.length === 0 ? (
            <p className={styles.empty}>
              {enquiryTotal === 0
                ? "No enquiries yet. Configure an enquiry, quote or callback action to receive messages here."
                : "No enquiries match this filter."}
            </p>
          ) : (
            <ol className={styles.list}>
              {enquiries.map((enquiry) => (
                <li className={styles.inboxItem} key={enquiry.id}>
                  <div>
                    <strong>{enquiry.senderName}</strong> · {enquiry.kind} ·{" "}
                    {formatDate(enquiry.submittedAt)}
                    {waitingLabel(enquiry) ? ` · ${waitingLabel(enquiry)}` : ""}
                  </div>
                  <p>{enquiry.message}</p>
                  <p className={styles.meta}>
                    {enquiry.senderEmail ?? "No email"} ·{" "}
                    {enquiry.senderPhone ?? "No phone"}
                    {enquiry.preferredTime ? ` · ${enquiry.preferredTime}` : ""}
                  </p>
                  {canEnquiries ? (
                    <>
                      <form
                        className={styles.actions}
                        action={updateEnquiryAction}
                      >
                        {hidden("businessId", businessId)}
                        {hidden("enquiryId", enquiry.id)}
                        {enquiryStatusFilter
                          ? hidden("enquiryStatus", enquiryStatusFilter)
                          : null}
                        {hidden("enquiryPage", String(enquiryPageNumber))}
                        <label htmlFor={`status-${enquiry.id}`}>Status</label>
                        <select
                          id={`status-${enquiry.id}`}
                          name="status"
                          defaultValue={enquiry.status}
                        >
                          {enquiryStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button className="button" type="submit">
                          Update
                        </button>
                      </form>
                      {enquiry.senderEmail ? (
                        <form
                          className={styles.actions}
                          action={replyToEnquiryAction}
                        >
                          {hidden("businessId", businessId)}
                          {hidden("enquiryId", enquiry.id)}
                          {enquiryStatusFilter
                            ? hidden("enquiryStatus", enquiryStatusFilter)
                            : null}
                          {hidden("enquiryPage", String(enquiryPageNumber))}
                          <label
                            htmlFor={`enquiry-reply-${enquiry.id}`}
                            className="sr-only"
                          >
                            Reply to {enquiry.senderName}
                          </label>
                          <textarea
                            id={`enquiry-reply-${enquiry.id}`}
                            name="body"
                            maxLength={2000}
                            placeholder={`Reply to ${enquiry.senderName} by email…`}
                            required
                          />
                          <button className="button primary" type="submit">
                            Send reply
                          </button>
                        </form>
                      ) : null}
                      <form
                        className={styles.actions}
                        action={deleteEnquiryAction}
                      >
                        {hidden("businessId", businessId)}
                        {hidden("enquiryId", enquiry.id)}
                        {enquiryStatusFilter
                          ? hidden("enquiryStatus", enquiryStatusFilter)
                          : null}
                        {hidden("enquiryPage", String(enquiryPageNumber))}
                        <button className="button" type="submit">
                          Delete
                        </button>
                      </form>
                    </>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          {enquiryTotal > 0 && (enquiryPageNumber > 1 || hasMoreEnquiries) ? (
            <div className={styles.toolbar}>
              {enquiryPageNumber > 1 ? (
                <Link
                  className="button"
                  href={
                    `/dashboard/business/${businessId}/operations?${enquiryStatusFilter ? `enquiryStatus=${enquiryStatusFilter}&` : ""}enquiryPage=${enquiryPageNumber - 1}#inbox` as Route
                  }
                >
                  Previous page
                </Link>
              ) : null}
              {hasMoreEnquiries ? (
                <Link
                  className="button"
                  href={
                    `/dashboard/business/${businessId}/operations?${enquiryStatusFilter ? `enquiryStatus=${enquiryStatusFilter}&` : ""}enquiryPage=${enquiryPageNumber + 1}#inbox` as Route
                  }
                >
                  Next page
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>

        <Suspense
          fallback={<SectionSkeleton id="offers" title="Special offers" />}
        >
          <OffersSection businessId={businessId} canContent={canContent} />
        </Suspense>

        <OpeningHoursSection
          businessId={businessId}
          canEdit={canEditProfile}
          hours={openingHours}
          today={londonDateString(new Date())}
          suggestions={upcomingBankHolidays({
            alreadySet:
              openingHours.state === "ready"
                ? openingHours.specialDays.map((day) => day.date)
                : [],
          })}
        />

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

        <section
          className={styles.section}
          id="lifecycle"
          aria-labelledby="lifecycle-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Phase 10</p>
              <h2 id="lifecycle-title">Publication and lifecycle</h2>
            </div>
            <p className={styles.meta}>
              Current state: {lifecycle?.state ?? "unavailable"}
            </p>
          </div>
          <div className={styles.grid}>
            <article className={styles.card}>
              <h3>Publication eligibility</h3>
              {eligibility.eligible ? (
                <p>All automated checks pass.</p>
              ) : (
                <>
                  <p>Complete these before automatic publication:</p>
                  <ul>
                    {eligibility.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <p className={styles.meta}>
                Terms accepted: {lifecycle?.termsAccepted ? "Yes" : "No"}
              </p>
              {canPublish && !lifecycle?.termsAccepted ? (
                <form action={acceptTermsAction}>
                  {hidden("businessId", businessId)}
                  <label className={styles.check}>
                    <input type="checkbox" name="acceptTerms" required /> I
                    confirm the business information is accurate, I have a
                    reasonable basis to manage it, and I accept the current free
                    website terms.
                  </label>
                  <button className="button primary" type="submit">
                    Accept terms
                  </button>
                </form>
              ) : null}
            </article>
            <article className={styles.card}>
              <h3>Automatic publication</h3>
              <p>
                {lifecycle?.autoPublishEnabled
                  ? `Scheduled for ${formatDate(lifecycle.autoPublishAt)}`
                  : "Off. Nothing will publish automatically."}
              </p>
              {canPublish ? (
                <>
                  <form action={configureAutoPublishAction}>
                    {hidden("businessId", businessId)}
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={lifecycle?.autoPublishEnabled}
                      />{" "}
                      Publish automatically after the 14-day reminder period
                      when eligible
                    </label>
                    <button className="button" type="submit">
                      Save preference
                    </button>
                  </form>
                  {lifecycle?.autoPublishEnabled ? (
                    <form action={postponeAutoPublishAction}>
                      {hidden("businessId", businessId)}
                      <div className={styles.field}>
                        <label htmlFor="postpone-until">Postpone until</label>
                        <input
                          id="postpone-until"
                          name="until"
                          type="datetime-local"
                          required
                        />
                      </div>
                      <button className="button" type="submit">
                        Postpone
                      </button>
                    </form>
                  ) : null}
                </>
              ) : null}
            </article>
            <article className={styles.card}>
              <h3>Reminder emails</h3>
              <p>
                {(lifecycle?.lifecycleEmailsEnabled ?? true)
                  ? "Owners receive publication, trading-check and other account reminder emails."
                  : "Off. Owners will not receive these reminder emails. Important account notices are unaffected."}
              </p>
              {canPublish ? (
                <form action={configureLifecycleEmailsAction}>
                  {hidden("businessId", businessId)}
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={lifecycle?.lifecycleEmailsEnabled ?? true}
                    />{" "}
                    Send reminder emails to owners
                  </label>
                  <button className="button" type="submit">
                    Save preference
                  </button>
                </form>
              ) : null}
            </article>
            <article className={styles.card}>
              <h3>Trading confirmation</h3>
              <p>
                Last confirmed: {formatDate(lifecycle?.lastConfirmedAt ?? null)}
              </p>
              <p>
                Next due: {formatDate(lifecycle?.nextConfirmationDueAt ?? null)}
              </p>
              {canLifecycle ? (
                <form action={confirmTradingAction}>
                  {hidden("businessId", businessId)}
                  <button className="button primary" type="submit">
                    Confirm still trading
                  </button>
                </form>
              ) : null}
            </article>
            {canLifecycle ? (
              <article className={styles.card}>
                <h3>Pause, close or recover</h3>
                <form className={styles.form} action={lifecycleAction}>
                  {hidden("businessId", businessId)}
                  <div className={styles.field}>
                    <label htmlFor="lifecycle-action">Action</label>
                    <select
                      id="lifecycle-action"
                      name="action"
                      defaultValue="pause"
                    >
                      <option value="pause">Pause/unpublish</option>
                      <option value="resume">Resume</option>
                      <option value="temporary_close">Temporarily close</option>
                      <option value="permanent_close">
                        Mark permanently closed
                      </option>
                      <option value="request_deletion">
                        Request recoverable deletion
                      </option>
                      <option value="cancel_deletion">
                        Cancel deletion request
                      </option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="temporary-close-until">
                      Temporary closure ends
                    </label>
                    <input
                      id="temporary-close-until"
                      name="temporaryClosedUntil"
                      type="datetime-local"
                    />
                  </div>
                  <button className="button" type="submit">
                    Apply lifecycle action
                  </button>
                </form>
                {lifecycle?.deleteAfter ? (
                  <p className={styles.meta}>
                    Deletion remains recoverable until{" "}
                    {formatDate(lifecycle.deleteAfter)}. No automated hard
                    deletion is activated.
                  </p>
                ) : null}
              </article>
            ) : null}
          </div>
        </section>

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
