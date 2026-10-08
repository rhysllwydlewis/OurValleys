"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
import styles from "./sign-in-form.module.css";

type ForgotPasswordFormProps = {
  idPrefix: string;
};

export function ForgotPasswordForm({ idPrefix }: ForgotPasswordFormProps) {
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const errorId = `${idPrefix}-error`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (result.error && result.error.status === 429) {
        setErrorMessage(t("auth.attemptsLimit"));
        return;
      }

      // Any other outcome shows the same neutral confirmation so the form
      // never reveals whether an address holds an account.
      setIsSent(true);
    } catch {
      setErrorMessage(t("auth.forgot.errNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <p className={styles.status} role="status">
        {t("auth.forgot.sent")}
      </p>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
    >
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-email`}>{t("auth.emailLabel")}</label>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          maxLength={254}
          required
          autoFocus
          disabled={isSubmitting}
          aria-describedby={errorMessage ? errorId : undefined}
        />
      </div>

      {errorMessage ? (
        <p className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("auth.forgot.sending") : t("auth.forgot.submit")}
      </button>
    </form>
  );
}
