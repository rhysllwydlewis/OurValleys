import Link from "next/link";
import styles from "../login.module.css";

export default function RegisterLoading() {
  return (
    <main className={styles.shell}>
      <section
        className={styles.card}
        aria-busy="true"
        aria-live="polite"
        aria-labelledby="register-loading-title"
      >
        <Link className={styles.brand} href="/" aria-label="OurValleys home">
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>Free business website and listing</p>
        <h1 id="register-loading-title">Loading registration…</h1>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading the registration page</span>
      </section>
    </main>
  );
}
