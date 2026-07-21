import type { Metadata, Route } from "next";
import Link from "next/link";
import { getModerationCounts } from "@/modules/businesses/admin-moderation";
import { countTotalUsers } from "@/modules/identity/admin-users";
import { countOpenContentReports } from "@/modules/moderation/content-reports";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin overview",
};

function businessesFilteredBy(status: string): Route {
  return `/admin/businesses?status=${status}` as Route;
}

export default async function AdminOverviewPage() {
  const [counts, totalUsers, openReports] = await Promise.all([
    getModerationCounts(),
    countTotalUsers(),
    countOpenContentReports(),
  ]);

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
    </>
  );
}
