import type { Metadata, Route } from "next";
import Link from "next/link";
import { listContentReports } from "@/modules/moderation/content-reports";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";
import { ReportRowActions } from "./report-row-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content reports",
};

const reasonLabels: Record<string, string> = {
  incorrect_details: "Incorrect details",
  closed_or_moved: "Closed or moved",
  inappropriate_content: "Inappropriate content",
  duplicate_listing: "Duplicate listing",
  other: "Other",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter =
    status === "resolved" || status === "dismissed" || status === "open"
      ? status
      : undefined;
  const result = await listContentReports(filter);

  return (
    <section>
      <h2>Content reports</h2>
      <div className={styles.filterBar}>
        {(["open", "resolved", "dismissed"] as const).map((value) => (
          <Link
            key={value}
            href={`/admin/reports?status=${value}` as Route}
            className={`${styles.filterLink} ${filter === value ? styles.filterLinkActive : ""}`}
          >
            {statusLabel(value)}
          </Link>
        ))}
        <Link
          href={"/admin/reports" as Route}
          className={`${styles.filterLink} ${!filter ? styles.filterLinkActive : ""}`}
        >
          All
        </Link>
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
                <th>Business</th>
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
                  <td>
                    <Link
                      className={styles.rowLink}
                      href={`/admin/businesses/${report.businessId}` as Route}
                    >
                      {report.businessTradingName}
                    </Link>
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
                      <ReportRowActions reportId={report.id} />
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
