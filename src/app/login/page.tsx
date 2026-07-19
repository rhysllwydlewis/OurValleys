import Link from "next/link";
import styles from "../login.module.css";

export default function LoginPage() {
  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="login-title">
        <Link className={styles.brand} href="/" aria-label="OurValleys home">
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>Dedicated sign-in route</p>
        <h1 id="login-title">Account access is not open yet.</h1>
        <p className={styles.lead}>
          The secure session foundation is connected, but public sign-in and
          account recovery will stay unavailable until their complete verified
          journeys are delivered. Public discovery does not require an account.
        </p>
        <p className={styles.notice} role="status">
          No credentials have been submitted or stored from the homepage
          preview. This route remains available even when the sign-in dialog
          cannot open.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/businesses">
            Search local businesses
          </Link>
          <Link className={styles.secondary} href="/">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
