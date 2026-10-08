import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import { businessPermissions } from "@/modules/businesses/permissions";
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
import { formatDate, hidden, hasPermission } from "./shared";

export async function InboxSection({
  businessId,
  userId,
  enquiryStatusFilter,
  enquiryPageNumber,
}: {
  businessId: string;
  userId: string;
  enquiryStatusFilter: EnquiryStatus | undefined;
  enquiryPageNumber: number;
}) {
  const i18n = await getTranslator();
  const { t } = i18n;
  const canEnquiriesPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageEnquiries,
  );
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
    return t(days === 1 ? "ops.inbox.waiting.one" : "ops.inbox.waiting.other", {
      days,
    });
  };
  const canEnquiries = await canEnquiriesPromise;

  return (
    <section
      className={styles.section}
      id="inbox"
      aria-labelledby="inbox-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.inbox.eyebrow")}</p>
          <h2 id="inbox-title">{t("ops.inbox.title")}</h2>
        </div>
        <p className={styles.meta}>
          {t(
            enquiryTotal === 1
              ? "ops.inbox.count.one"
              : "ops.inbox.count.other",
            { count: enquiryTotal },
          )}
        </p>
      </div>
      {canEnquiries && staleUnansweredCount > 0 ? (
        <p className={styles.notice} role="status">
          {t(
            staleUnansweredCount === 1
              ? "ops.inbox.stale.one"
              : "ops.inbox.stale.other",
            { count: staleUnansweredCount, days: ENQUIRY_STALE_AFTER_DAYS },
          )}
        </p>
      ) : null}
      <div className={styles.toolbar}>
        <Link
          href={`/dashboard/business/${businessId}/operations#inbox` as Route}
          aria-current={!enquiryStatusFilter ? "page" : undefined}
          className="button"
        >
          {t("ops.inbox.all")}
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
            {t(`ops.enquiry.status.${status}`)}
          </Link>
        ))}
        {canEnquiries ? (
          <a
            className="button"
            href={`/dashboard/business/${businessId}/operations/enquiries/export${enquiryStatusFilter ? `?status=${enquiryStatusFilter}` : ""}`}
          >
            {t("ops.inbox.export")}
          </a>
        ) : null}
      </div>
      {enquiries.length === 0 ? (
        <p className={styles.empty}>
          {enquiryTotal === 0
            ? t("ops.inbox.emptyNone")
            : t("ops.inbox.emptyFilter")}
        </p>
      ) : (
        <ol className={styles.list}>
          {enquiries.map((enquiry) => (
            <li className={styles.inboxItem} key={enquiry.id}>
              <div>
                <strong lang={authoredTextLang}>{enquiry.senderName}</strong> ·{" "}
                {t(`ops.enquiry.kind.${enquiry.kind}`)} ·{" "}
                {formatDate(enquiry.submittedAt, i18n)}
                {waitingLabel(enquiry) ? ` · ${waitingLabel(enquiry)}` : ""}
              </div>
              <p lang={authoredTextLang}>{enquiry.message}</p>
              <p className={styles.meta}>
                {enquiry.senderEmail ?? t("ops.inbox.noEmail")} ·{" "}
                {enquiry.senderPhone ?? t("ops.inbox.noPhone")}
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
                    <label htmlFor={`status-${enquiry.id}`}>
                      {t("ops.common.status")}
                    </label>
                    <select
                      id={`status-${enquiry.id}`}
                      name="status"
                      defaultValue={enquiry.status}
                    >
                      {enquiryStatuses.map((status) => (
                        <option key={status} value={status}>
                          {t(`ops.enquiry.status.${status}`)}
                        </option>
                      ))}
                    </select>
                    <button className="button" type="submit">
                      {t("ops.common.update")}
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
                        {t("ops.inbox.replyTo", { name: enquiry.senderName })}
                      </label>
                      <textarea
                        id={`enquiry-reply-${enquiry.id}`}
                        name="body"
                        maxLength={2000}
                        placeholder={t("ops.inbox.replyPlaceholder", {
                          name: enquiry.senderName,
                        })}
                        required
                      />
                      <button className="button primary" type="submit">
                        {t("ops.inbox.send")}
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
                      {t("ops.common.delete")}
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
              {t("ops.inbox.previous")}
            </Link>
          ) : null}
          {hasMoreEnquiries ? (
            <Link
              className="button"
              href={
                `/dashboard/business/${businessId}/operations?${enquiryStatusFilter ? `enquiryStatus=${enquiryStatusFilter}&` : ""}enquiryPage=${enquiryPageNumber + 1}#inbox` as Route
              }
            >
              {t("ops.inbox.next")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
