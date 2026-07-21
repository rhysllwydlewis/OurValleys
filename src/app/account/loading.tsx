import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import styles from "./account.module.css";

export default function AccountLoading() {
  return (
    <>
      <SiteHeader />
      <main className={styles.shell} aria-busy="true" aria-live="polite">
        <p className={styles.eyebrow}>Your account</p>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading your account</span>
      </main>
      <SiteFooter />
    </>
  );
}
