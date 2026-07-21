import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  isModerationStatusFilter,
  listBusinessesForModeration,
  type ModerationStatusFilter,
} from "@/modules/businesses/admin-moderation";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business moderation",
};

const filters: { value: ModerationStatusFilter | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Awaiting review" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Changes requested" },
  { value: "suspended", label: "Suspended" },
  { value: "draft", label: "Draft" },
];

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter =
    status && isModerationStatusFilter(status) ? status : undefined;

  const result = await listBusinessesForModeration(activeFilter);

  return (
    <section>
      <h2>Businesses</h2>
      <div className={styles.filterBar}>
        {filters.map((filter) => {
          const isActive =
            filter.value === "all"
              ? !activeFilter
              : activeFilter === filter.value;
          const href: Route =
            filter.value === "all"
              ? ("/admin/businesses" as Route)
              : (`/admin/businesses?status=${filter.value}` as Route);
          return (
            <Link
              key={filter.value}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`${styles.filterLink} ${isActive ? styles.filterLinkActive : ""}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Business data is temporarily unavailable. Please try again shortly.
        </div>
      ) : result.businesses.length === 0 ? (
        <div className={styles.emptyState}>
          No businesses match this filter.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>Category</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {result.businesses.map((business) => (
                <tr key={business.id}>
                  <td>
                    <Link
                      className={styles.rowLink}
                      href={`/admin/businesses/${business.id}` as Route}
                    >
                      {business.tradingName}
                    </Link>
                    {business.isDemo ? (
                      <span
                        className={`${styles.pill} ${styles.toneNeutral} ${styles.pillInline}`}
                      >
                        Demo
                      </span>
                    ) : null}
                  </td>
                  <td>{business.categoryName}</td>
                  <td>
                    <span
                      className={`${styles.pill} ${styles[statusTone(business.status)]}`}
                    >
                      {statusLabel(business.status)}
                    </span>
                  </td>
                  <td>
                    {business.submittedAt
                      ? formatDate(business.submittedAt)
                      : "—"}
                  </td>
                  <td>{formatDate(business.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
