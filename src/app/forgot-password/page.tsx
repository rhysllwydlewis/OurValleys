import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isRegistrationOpen } from "@/lib/email";
import styles from "../login.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password-reset link for your OurValleys account.",
};

export default function ForgotPasswordPage() {
  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="forgot-title">
        <Link className={styles.brand} href="/" aria-label="OurValleys home">
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 id="forgot-title">Forgotten your password?</h1>
        {isRegistrationOpen() ? (
          <>
            <p className={styles.lead}>
              Enter your account email address and we will send a link to choose
              a new password.
            </p>
            <ForgotPasswordForm idPrefix="forgot-page" />
          </>
        ) : (
          <p className={styles.lead}>
            Password-reset emails cannot be delivered from this environment just
            yet. Please check back soon.
          </p>
        )}
        <div className={styles.actions}>
          <Link className={styles.primary} href="/login">
            Back to sign in
          </Link>
          <Link className={styles.secondary} href="/">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
