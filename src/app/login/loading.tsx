import Link from "next/link";
import styles from "../login.module.css";

export default function LoginLoading() {
  return (
    <main className={styles.shell}>
      <section
        className={styles.card}
        aria-busy="true"
        aria-live="polite"
        aria-labelledby="login-loading-title"
      >
        <Link className={styles.brand} href="/" aria-label="OurValleys home">
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>Secure account access</p>
        <h1 id="login-loading-title">Loading sign in…</h1>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading the sign-in page</span>
      </section>
    </main>
  );
}
