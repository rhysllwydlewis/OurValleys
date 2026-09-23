import type { Metadata, Route } from "next";
import Link from "next/link";
import { getModerationCounts } from "@/modules/businesses/admin-moderation";
import { countTotalUsers } from "@/modules/identity/admin-users";
import { countOpenContentReports } from "@/modules/moderation/content-reports";
import { getFounderDashboardSummary } from "@/modules/platform/founder-dashboard";
import styles from "./admin.module.css";

const weekLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

function formatWeekLabel(isoDate: string): string {
  return weekLabelFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin overview",
};

function businessesFilteredBy(status: string): Route {
  return `/admin/businesses?status=${status}` as Route;
}

export default async function AdminOverviewPage() {
  const [counts, totalUsers, openReports, founderDashboard] = await Promise.all(
    [
      getModerationCounts(),
      countTotalUsers(),
      countOpenContentReports(),
      getFounderDashboardSummary(),
    ],
  );
  const { activity, coverage, activeBusinessesTrend } = founderDashboard;

  return (
    <>
      <div className={styles.statRow}>
        <Link
          className={`${styles.statTile} ${styles.statTileLink}`}
          href={businessesFilteredBy("pending_review")}
        >
          <strong>{counts.pendingReview}</strong>
          <span>Awaiting review</span>
        </Link>
        <Link
          className={`${styles.statTile} ${styles.statTileLink}`}
          href={businessesFilteredBy("published")}
        >
          <strong>{counts.published}</strong>
          <span>Published</span>
        </Link>
        <Link
          className={`${styles.statTile} ${styles.statTileLink}`}
          href={businessesFilteredBy("suspended")}
        >
          <strong>{counts.suspended}</strong>
          <span>Suspended</span>
        </Link>
        <Link
          className={`${styles.statTile} ${styles.statTileLink}`}
          href={"/admin/reports" as Route}
        >
          <strong>{openReports}</strong>
          <span>Open reports</span>
        </Link>
        <div className={styles.statTile}>
          <strong>{counts.total}</strong>
          <span>Total businesses</span>
        </div>
        <div className={styles.statTile}>
          <strong>{totalUsers}</strong>
          <span>Total users</span>
        </div>
      </div>

      <section className={styles.section}>
        <h2>Where to start</h2>
        <div className={styles.card}>
          <p>
            New business profiles wait in{" "}
            <Link href={businessesFilteredBy("pending_review")}>
              Businesses → Awaiting review
            </Link>{" "}
            before they can appear in public discovery. Public corrections
            arrive in <Link href={"/admin/reports" as Route}>Reports</Link>.
            Category and place reference data used across the site lives under{" "}
            <Link href={"/admin/categories" as Route}>Categories</Link> and{" "}
            <Link href={"/admin/places" as Route}>Places</Link>.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Platform health</h2>
        <p className={styles.hint}>
          How the platform is doing beyond the moderation queue: are businesses
          appearing in search and turning into real connections, and where is
          coverage still thin.
        </p>

        <div className={styles.statRow}>
          <div className={styles.statTile}>
            <strong>{activity.searchAppearances}</strong>
            <span>Search appearances ({activity.periodDays}d)</span>
          </div>
          <div className={styles.statTile}>
            <strong>{activity.connections}</strong>
            <span>Connections ({activity.periodDays}d)</span>
          </div>
        </div>

        <div className={styles.card}>
          <h3>Active businesses trend</h3>
          {activeBusinessesTrend.every((point) => point.publishedCount === 0) &&
          activeBusinessesTrend.at(-1)?.cumulativeTotal === 0 ? (
            <p className={styles.hint}>
              No businesses have published yet in the tracked window.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Week starting</th>
                    <th scope="col">Newly published</th>
                    <th scope="col">Total published</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBusinessesTrend.map((point) => (
                    <tr key={point.weekStart}>
                      <td>{formatWeekLabel(point.weekStart)}</td>
                      <td>{point.publishedCount}</td>
                      <td>{point.cumulativeTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h3>Places with the least coverage</h3>
          {coverage.emptiestPlaces.length === 0 ? (
            <p className={styles.hint}>No active places found.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Place</th>
                    <th scope="col">Published businesses</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.emptiestPlaces.map((gap) => (
                    <tr key={gap.slug}>
                      <td>
                        <Link
                          className={styles.rowLink}
                          href={`/places/${gap.slug}` as Route}
                        >
                          {gap.name}
                        </Link>
                      </td>
                      <td>{gap.publishedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h3>Categories with the least coverage</h3>
          {coverage.emptiestCategories.length === 0 ? (
            <p className={styles.hint}>No active categories found.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Published businesses</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.emptiestCategories.map((gap) => (
                    <tr key={gap.slug}>
                      <td>
                        <Link
                          className={styles.rowLink}
                          href={`/categories/${gap.slug}` as Route}
                        >
                          {gap.name}
                        </Link>
                      </td>
                      <td>{gap.publishedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
