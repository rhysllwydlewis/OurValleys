"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
import type { Translator } from "@/lib/i18n/translate";
import styles from "./sign-in-form.module.css";

type ResetPasswordFormProps = {
  idPrefix: string;
  token: string;
};

function getResetErrorMessage(
  t: Translator,
  status: number | undefined,
): string {
  if (status === 400 || status === 401 || status === 403) {
    return t("auth.reset.errInvalid");
  }

  if (status === 429) {
    return t("auth.attemptsLimit");
  }

  return t("auth.reset.errGeneric");
}

export function ResetPasswordForm({ idPrefix, token }: ResetPasswordFormProps) {
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const errorId = `${idPrefix}-error`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setErrorMessage(t("auth.reset.mismatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.resetPassword({ newPassword, token });

      if (result.error) {
        setErrorMessage(getResetErrorMessage(t, result.error.status));
        return;
      }

      setIsComplete(true);
    } catch {
      setErrorMessage(t("auth.reset.errNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className={styles.form}>
        <p className={styles.status} role="status">
          {t("auth.reset.done")}
        </p>
        <Link className={styles.linkButton} href="/login">
          {t("auth.reset.goSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
    >
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-new-password`}>
          {t("auth.reset.newLabel")}
        </label>
        <input
          id={`${idPrefix}-new-password`}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          autoFocus
          disabled={isSubmitting}
          aria-describedby={
            errorMessage
              ? `${idPrefix}-password-hint ${errorId}`
              : `${idPrefix}-password-hint`
          }
        />
        <p className={styles.hint} id={`${idPrefix}-password-hint`}>
          {t("auth.passwordHint")}
        </p>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-confirm-password`}>
          {t("auth.reset.confirmLabel")}
        </label>
        <input
          id={`${idPrefix}-confirm-password`}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
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
        {isSubmitting ? t("auth.reset.saving") : t("auth.reset.submit")}
      </button>
    </form>
  );
}
