"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/lib/i18n/client";
import styles from "./start-business.module.css";

/** Sends a fresh verification email to the signed-in account's address. */
export function ResendVerification({ email }: { email: string }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/account/new-business",
      });
      setMessage(
        result.error
          ? t("auth.form.resendFailed")
          : t("auth.form.resendOkSignIn"),
      );
    } catch {
      setMessage(t("auth.form.resendFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={styles.ghostButton}
        onClick={resend}
        disabled={busy}
      >
        {t("auth.form.resendVerification")}
      </button>
      {message ? (
        <p className={styles.statusLine} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
