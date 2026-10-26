import type { Metadata, Route } from "next";
import Link from "next/link";
import { listUnmetDemand } from "@/modules/platform/unmet-demand";
import {
  UNMET_DEMAND_WINDOWS,
  parseUnmetDemandWindow,
} from "@/modules/platform/unmet-demand-shared";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unmet demand",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminUnmetDemandPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const windowDays = parseUnmetDemandWindow(days);
  const rows = await listUnmetDemand(windowDays);

  return (
    <section>
      <h2>Unmet demand</h2>
      <p className={styles.hint}>
        Searches that found no business, grouped by wording (ignoring case and
        spacing) and the filters used. Use it to decide what to seed next. No
        visitor identifiers are stored, and entries are removed after 90 days.
      </p>
      <div className={styles.filterBar}>
        {UNMET_DEMAND_WINDOWS.map((value) => (
          <Link
            key={value}
            href={`/admin/demand?days=${value}` as Route}
            aria-current={windowDays === value ? "page" : undefined}
            className={`${styles.filterLink} ${windowDays === value ? styles.filterLinkActive : ""}`}
          >
            Last {value} days
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className={styles.emptyState}>
          No empty searches in the last {windowDays} days.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">
              Empty searches in the last {windowDays} days, most repeated first
            </caption>
            <thead>
              <tr>
                <th scope="col">Search text</th>
                <th scope="col">Category</th>
                <th scope="col">Place</th>
                <th scope="col">Times</th>
                <th scope="col">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.queryText}|${row.categorySlug}|${row.placeSlug}`}
                >
                  <td>{row.queryText ?? "—"}</td>
                  <td>{row.categorySlug ?? "—"}</td>
                  <td>{row.placeSlug ?? "—"}</td>
                  <td>{row.occurrences}</td>
                  <td>{formatDate(row.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.hint}>
        Found a gap? Add the business through{" "}
        <Link href={"/admin/import" as Route}>Import</Link> or review leads in{" "}
        <Link href={"/admin/suggestions" as Route}>Suggestions</Link>.
      </p>
    </section>
  );
}
