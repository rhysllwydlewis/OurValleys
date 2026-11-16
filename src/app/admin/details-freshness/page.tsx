import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readAdminSession } from "@/modules/identity/admin-access";
import { getDetailsFreshness } from "@/modules/platform/details-freshness";
import {
  isFreshnessGroup,
  type FreshnessGroup,
} from "@/modules/platform/details-freshness-model";
import styles from "../admin.module.css";
import type { StatusTone } from "../status-tone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Details freshness",
};

const ROW_LIMIT = 100;

const groups: Record<FreshnessGroup, { label: string; tone: StatusTone }> = {
  overdue: { label: "Overdue", tone: "toneDanger" },
  ageing: { label: "Over six months", tone: "toneWarning" },
  never: { label: "Never confirmed", tone: "toneNeutral" },
};

const filters: { value: FreshnessGroup | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: groups.overdue.label },
  { value: "ageing", label: groups.ageing.label },
  { value: "never", label: groups.never.label },
];

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminDetailsFreshnessPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const admin = await readAdminSession();
  if (!admin) notFound();

  const { show } = await searchParams;
  const activeFilter = show && isFreshnessGroup(show) ? show : undefined;
  const freshness = await getDetailsFreshness();
  const matching = activeFilter
    ? freshness.rows.filter((row) => row.group === activeFilter)
    : freshness.rows;
  const shown = matching.slice(0, ROW_LIMIT);

  return (
    <section>
      <h2>Details freshness</h2>
      <p>
        How recently owners confirmed that their hours, contact details and
        services are still right. Owners are reminded after six months and asked
        to confirm after twelve; an overdue page tells visitors it has not been
        recently confirmed and is unpublished if the owner still does not
        respond.
      </p>
      <div className={styles.statRow}>
        <div className={styles.statTile}>
          <strong>{freshness.fresh}</strong>
          <span>Confirmed in the last six months</span>
        </div>
        <div className={styles.statTile}>
          <strong>{freshness.counts.ageing}</strong>
          <span>Confirmed over six months ago</span>
        </div>
        <div className={styles.statTile}>
          <strong>{freshness.counts.overdue}</strong>
          <span>Overdue</span>
        </div>
        <div className={styles.statTile}>
          <strong>{freshness.counts.never}</strong>
          <span>Never confirmed</span>
        </div>
      </div>
      <div className={styles.filterBar}>
        {filters.map((filter) => {
          const isActive =
            filter.value === "all"
              ? !activeFilter
              : activeFilter === filter.value;
          const href: Route =
            filter.value === "all"
              ? ("/admin/details-freshness" as Route)
              : (`/admin/details-freshness?show=${filter.value}` as Route);
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
      {matching.length === 0 ? (
        <div className={styles.emptyState}>
          {freshness.total === 0
            ? "No published businesses yet."
            : activeFilter
              ? "No published businesses match this filter."
              : "Every published business was confirmed in the last six months."}
        </div>
      ) : (
        <>
          <p>
            {matching.length} of {freshness.total} published businesses
            {matching.length > shown.length
              ? ` (showing the first ${shown.length})`
              : ""}
            . The most urgent come first.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className="sr-only">
                Businesses whose details have not been confirmed recently
              </caption>
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last confirmed</th>
                  <th scope="col">Unpublishes on</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">
                      <Link
                        className={styles.rowLink}
                        href={`/admin/businesses/${row.id}` as Route}
                      >
                        {row.tradingName}
                      </Link>
                    </th>
                    <td>
                      <span
                        className={`${styles.pill} ${styles[groups[row.group].tone]}`}
                      >
                        {groups[row.group].label}
                      </span>
                    </td>
                    <td>{formatDate(row.lastConfirmedAt)}</td>
                    <td>{formatDate(row.unpublishesAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
