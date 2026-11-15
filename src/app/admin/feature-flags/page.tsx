import type { Metadata } from "next";
import { listFeatureFlagsForAdmin } from "@/modules/platform/feature-flags";
import styles from "../admin.module.css";
import { FeatureFlagManager } from "./feature-flag-manager";
import { readAdminSession } from "@/modules/identity/admin-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feature flags",
};

export default async function AdminFeatureFlagsPage() {
  // The layout above is not a security boundary: the page itself must refuse
  // before it reads any data, or that data is still sent in the response.
  if (!(await readAdminSession())) return null;

  const result = await listFeatureFlagsForAdmin();

  return (
    <section>
      <h2>Feature flags</h2>
      <p className={styles.hint}>
        Future modules stay disabled until an admin turns them on here. A flag
        with no environments selected applies everywhere once enabled; use
        environments to roll a change out to development or preview before
        production.
      </p>
      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Feature flag data is temporarily unavailable. Please try again
          shortly.
        </div>
      ) : (
        <FeatureFlagManager flags={result.flags} />
      )}
    </section>
  );
}
