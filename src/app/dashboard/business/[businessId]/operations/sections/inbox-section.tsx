import Link from "next/link";
import type { Route } from "next";
import {
  countStaleUnansweredEnquiries,
  ENQUIRY_STALE_AFTER_DAYS,
  enquiryStatuses,
  enquiryWaitingDays,
  listBusinessEnquiriesPage,
  type EnquiryStatus,
} from "@/modules/businesses/contacts-and-enquiries";
import {
  deleteEnquiryAction,
  replyToEnquiryAction,
  updateEnquiryAction,
} from "../actions";
import styles from "../operations.module.css";
import { formatDate, hidden } from "./shared";

export async function InboxSection({
  businessId,
  canEnquiries,
  enquiryStatusFilter,
  enquiryPageNumber,
}: {
  businessId: string;
  canEnquiries: boolean;
  enquiryStatusFilter: EnquiryStatus | undefined;
  enquiryPageNumber: number;
}) {
  const [enquiryResult, staleUnansweredCount] = await Promise.all([
    listBusinessEnquiriesPage(businessId, {
      status: enquiryStatusFilter,
      page: enquiryPageNumber,
    }),
    countStaleUnansweredEnquiries(businessId),
  ]);
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
          {staleUnansweredCount === 1 ? "y has" : "ies have"} waited more than{" "}
          {ENQUIRY_STALE_AFTER_DAYS} days for a reply. A quick answer, even a
          short one, helps people decide to trust your business.
        </p>
      ) : null}
      <div className={styles.toolbar}>
        <Link
          href={`/dashboard/business/${businessId}/operations#inbox` as Route}
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
            aria-current={enquiryStatusFilter === status ? "page" : undefined}
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
                  <form className={styles.actions} action={updateEnquiryAction}>
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
                  <form className={styles.actions} action={deleteEnquiryAction}>
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
  );
}
