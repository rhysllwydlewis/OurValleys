import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import styles from "../login.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Choose a new password to secure your OurValleys account.",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[]; error?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const isInvalidLink = !token || params.error === "INVALID_TOKEN";

  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="reset-title">
        <Link className={styles.brand} href="/" aria-label="OurValleys home">
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 id="reset-title">Choose a new password.</h1>
        {isInvalidLink ? (
          <p className={styles.lead}>
            This password-reset link is missing or no longer valid. Reset links
            stay valid for one hour. Request a fresh link to continue.
          </p>
        ) : (
          <>
            <p className={styles.lead}>
              Enter a new password for your OurValleys account. It must be at
              least 8 characters.
            </p>
            <ResetPasswordForm idPrefix="reset-page" token={token} />
          </>
        )}
        <div className={styles.actions}>
          {isInvalidLink ? (
            <Link className={styles.primary} href="/forgot-password">
              Request a new link
            </Link>
          ) : (
            <Link className={styles.primary} href="/login">
              Back to sign in
            </Link>
          )}
          <Link className={styles.secondary} href="/">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
