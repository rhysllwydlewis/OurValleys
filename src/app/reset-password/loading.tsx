import Link from "next/link";
import styles from "../login.module.css";

export default function ResetPasswordLoading() {
  return (
    <main className={styles.shell}>
      <section
        className={styles.card}
        aria-busy="true"
        aria-live="polite"
        aria-labelledby="reset-loading-title"
      >
        <Link className={styles.brand} href="/" aria-label="OurValleys home">
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 id="reset-loading-title">Loading password reset…</h1>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading the password reset page</span>
      </section>
    </main>
  );
}
