import type { Metadata } from "next";
import { listAllGuidesForAdmin } from "@/modules/guides/admin";
import { listOverdueGuidesForReview } from "@/modules/guides/public";
import styles from "../admin.module.css";
import { GuideManager } from "./guide-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guides",
};

export default async function AdminGuidesPage() {
  const [guidesResult, overdueGuides] = await Promise.all([
    listAllGuidesForAdmin(),
    listOverdueGuidesForReview(),
  ]);

  return (
    <section>
      <h2>Guides</h2>
      <p className={styles.hint}>
        Guides connect businesses, places and events into a single published
        journey. A guide stays out of the public directory until it is published
        and passes the publishing checks; moving it back to draft or archiving
        it removes it again.
      </p>
      {overdueGuides.length > 0 ? (
        <div className={`${styles.card} ${styles.spaced}`}>
          <strong>{overdueGuides.length}</strong> published guide
          {overdueGuides.length === 1 ? " has" : "s have"} passed its review
          date: {overdueGuides.map((item) => item.title).join(", ")}.
        </div>
      ) : null}
      {guidesResult.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Guide data is temporarily unavailable. Please try again shortly.
        </div>
      ) : (
        <GuideManager
          guides={guidesResult.guides}
          overdueGuideIds={new Set(overdueGuides.map((item) => item.id))}
        />
      )}
    </section>
  );
}
