import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import styles from "./admin.module.css";

export default function AdminLoading() {
  return (
    <>
      <SiteHeader />
      <main className={styles.shell} aria-busy="true" aria-live="polite">
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Platform administration</p>
            <h1>Admin</h1>
          </div>
        </div>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading admin dashboard</span>
      </main>
      <SiteFooter />
    </>
  );
}
