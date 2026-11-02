import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  listContentReports,
  type ContentReportSummary,
} from "@/modules/moderation/content-reports";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";
import {
  ReportRowActions,
  RestoreButton,
  type ReportedItem,
} from "./report-row-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content reports",
};

const reasonLabels: Record<string, string> = {
  incorrect_details: "Incorrect details",
  closed_or_moved: "Closed or moved",
  inappropriate_content: "Inappropriate content",
  duplicate_listing: "Duplicate listing",
  abusive_or_offensive: "Abusive or offensive",
  spam_or_advertising: "Spam or advertising",
  fake_or_not_a_customer: "Fake or not a customer",
  off_topic: "Off topic",
  cancelled_or_wrong_date: "Cancelled or wrong date",
  misleading_or_scam: "Misleading or a scam",
  not_available: "Not available",
  other: "Other",
};

const targetTypeLabels: Record<string, string> = {
  business: "Business",
  review: "Review",
  event: "Event",
  offer: "Offer",
  update: "Update",
};

const typeFilters = [
  ["business", "Listings"],
  ["review", "Reviews"],
  ["event", "Events"],
  ["offer", "Offers"],
  ["update", "Updates"],
] as const;

function reportedItem(report: ContentReportSummary): ReportedItem | null {
  if (report.targetType === "event") {
    return { kind: "event", title: report.eventTitle ?? "event" };
  }
  if (report.targetType === "offer") {
    return { kind: "offer", title: report.offerTitle ?? "offer" };
  }
  if (report.targetType === "update") {
    return { kind: "update", title: report.updateTitle ?? "update" };
  }
  return null;
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const { status, type } = await searchParams;
  const typeFilter = typeFilters.find(([value]) => value === type)?.[0];
  const filter =
    status === "resolved" || status === "dismissed" || status === "open"
      ? status
      : undefined;
  const result = await listContentReports(filter, typeFilter);
  const hrefFor = (nextStatus?: string, nextType?: string) => {
    const query = new URLSearchParams();
    if (nextStatus) query.set("status", nextStatus);
    if (nextType) query.set("type", nextType);
    const text = query.toString();
    return `/admin/reports${text ? `?${text}` : ""}` as Route;
  };

  return (
    <section>
      <h2>Content reports</h2>
      <div className={styles.filterBar}>
        {(["open", "resolved", "dismissed"] as const).map((value) => (
          <Link
            key={value}
            href={hrefFor(value, typeFilter)}
            aria-current={filter === value ? "page" : undefined}
            className={`${styles.filterLink} ${filter === value ? styles.filterLinkActive : ""}`}
          >
            {statusLabel(value)}
          </Link>
        ))}
        <Link
          href={hrefFor(undefined, typeFilter)}
          aria-current={!filter ? "page" : undefined}
          className={`${styles.filterLink} ${!filter ? styles.filterLinkActive : ""}`}
        >
          All
        </Link>
      </div>
      <div
        className={styles.filterBar}
        role="group"
        aria-label="Filter by type"
      >
        <Link
          href={hrefFor(filter)}
          aria-current={!typeFilter ? "page" : undefined}
          className={`${styles.filterLink} ${!typeFilter ? styles.filterLinkActive : ""}`}
        >
          Everything
        </Link>
        {typeFilters.map(([value, label]) => (
          <Link
            key={value}
            href={hrefFor(filter, value)}
            aria-current={typeFilter === value ? "page" : undefined}
            className={`${styles.filterLink} ${typeFilter === value ? styles.filterLinkActive : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Reports are temporarily unavailable. Please try again shortly.
        </div>
      ) : result.reports.length === 0 ? (
        <div className={styles.emptyState}>No reports match this filter.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Business</th>
                <th>Content</th>
                <th>Reason</th>
                <th>Details</th>
                <th>Status</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.reports.map((report) => (
                <tr key={report.id}>
                  <td>{targetTypeLabels[report.targetType] ?? "Business"}</td>
                  <td>
                    <Link
                      className={styles.rowLink}
                      href={`/admin/businesses/${report.businessId}` as Route}
                    >
                      {report.businessTradingName}
                    </Link>
                  </td>
                  <td>
                    {report.targetType === "review" ? (
                      <>
                        {report.reviewRating != null
                          ? `${report.reviewRating}★ — `
                          : ""}
                        {report.reviewBody ?? "(no review text)"}
                      </>
                    ) : report.targetType === "event" ? (
                      (report.eventTitle ?? "(event removed)")
                    ) : report.targetType === "offer" ? (
                      (report.offerTitle ?? "(offer removed)")
                    ) : report.targetType === "update" ? (
                      (report.updateTitle ?? "(update removed)")
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{reasonLabels[report.reason] ?? report.reason}</td>
                  <td>{report.details ?? "—"}</td>
                  <td>
                    <span
                      className={`${styles.pill} ${styles[statusTone(report.status)]}`}
                    >
                      {statusLabel(report.status)}
                    </span>
                  </td>
                  <td>{formatDate(report.createdAt)}</td>
                  <td>
                    {report.status === "open" ? (
                      <ReportRowActions
                        reportId={report.id}
                        item={reportedItem(report)}
                      />
                    ) : report.targetStatus === "removed" &&
                      reportedItem(report) ? (
                      <>
                        <p className={styles.mutedNote}>Removed</p>
                        <RestoreButton
                          reportId={report.id}
                          item={reportedItem(report) as ReportedItem}
                        />
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
