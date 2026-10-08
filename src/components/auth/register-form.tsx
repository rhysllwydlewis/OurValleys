"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
import type { Translator } from "@/lib/i18n/translate";
import styles from "./sign-in-form.module.css";

type RegisterFormProps = {
  idPrefix: string;
};

function getSignUpErrorMessage(
  t: Translator,
  status: number | undefined,
): string {
  if (status === 422 || status === 400) {
    return t("auth.register.errUnusable");
  }

  if (status === 429) {
    return t("auth.attemptsLimit");
  }

  if (status === 503) {
    return t("auth.register.errUnavailable");
  }

  return t("auth.register.errGeneric");
}

export function RegisterForm({ idPrefix }: RegisterFormProps) {
  const t = useT();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState("");
  const errorId = `${idPrefix}-error`;
  const hasError = Boolean(errorMessage);

  function clearFeedback() {
    if (errorMessage) setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const marketingOptIn = formData.get("marketingOptIn") === "on";

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
        marketingOptIn,
        callbackURL: "/account",
      });

      if (result.error) {
        setErrorMessage(getSignUpErrorMessage(t, result.error.status));
        return;
      }

      setRegisteredEmail(email);
    } catch {
      setErrorMessage(t("auth.register.errNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendVerification() {
    if (!registeredEmail) return;
    setResendStatus("");
    setIsSubmitting(true);

    try {
      const result = await authClient.sendVerificationEmail({
        email: registeredEmail,
        callbackURL: "/account",
      });
      setResendStatus(
        result.error
          ? t("auth.form.resendFailed")
          : t("auth.register.resendOk"),
      );
    } catch {
      setResendStatus(t("auth.form.resendFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className={styles.form}>
        <p className={styles.status} role="status">
          {t("auth.register.sentBefore")} <strong>{registeredEmail}</strong>.{" "}
          {t("auth.register.sentAfter")}
        </p>
        <button
          type="button"
          className={styles.linkButton}
          onClick={resendVerification}
          disabled={isSubmitting}
        >
          {t("auth.register.resend")}
        </button>
        <p className={styles.srStatus} role="status" aria-live="polite">
          {resendStatus}
        </p>
        {resendStatus ? <p className={styles.status}>{resendStatus}</p> : null}
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
        <label htmlFor={`${idPrefix}-name`}>{t("auth.nameLabel")}</label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          autoComplete="name"
          maxLength={120}
          required
          autoFocus
          disabled={isSubmitting}
          aria-describedby={hasError ? errorId : undefined}
          onInput={clearFeedback}
        />
      </div>

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
          disabled={isSubmitting}
          aria-describedby={hasError ? errorId : undefined}
          onInput={clearFeedback}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-password`}>{t("auth.chooseLabel")}</label>
        <input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={isSubmitting}
          aria-describedby={
            hasError
              ? `${idPrefix}-password-hint ${errorId}`
              : `${idPrefix}-password-hint`
          }
          onInput={clearFeedback}
        />
        <p className={styles.hint} id={`${idPrefix}-password-hint`}>
          {t("auth.passwordHint")}
        </p>
      </div>

      <label className={styles.remember} htmlFor={`${idPrefix}-terms`}>
        <input
          id={`${idPrefix}-terms`}
          name="terms"
          type="checkbox"
          required
          disabled={isSubmitting}
        />
        <span>
          {t("auth.register.termsBefore")}{" "}
          <Link
            href="/policies/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("auth.register.termsLink")}
          </Link>
          .
        </span>
      </label>

      <label className={styles.remember} htmlFor={`${idPrefix}-marketing`}>
        <input
          id={`${idPrefix}-marketing`}
          name="marketingOptIn"
          type="checkbox"
          disabled={isSubmitting}
        />
        <span>{t("auth.register.marketing")}</span>
      </label>

      {errorMessage ? (
        <p className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("auth.register.creating") : t("auth.register.submit")}
      </button>
    </form>
  );
}
