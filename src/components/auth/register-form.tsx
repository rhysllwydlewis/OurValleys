"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./sign-in-form.module.css";

type RegisterFormProps = {
  idPrefix: string;
};

function getSignUpErrorMessage(status: number | undefined): string {
  if (status === 422 || status === 400) {
    return "This email address cannot be used for a new account. If it is already registered, sign in instead or reset the password.";
  }

  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (status === 503) {
    return "Registration is temporarily unavailable. Please try again shortly.";
  }

  return "We could not create your account. Please check your details and try again.";
}

export function RegisterForm({ idPrefix }: RegisterFormProps) {
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
        setErrorMessage(getSignUpErrorMessage(result.error.status));
        return;
      }

      setRegisteredEmail(email);
    } catch {
      setErrorMessage(
        "Registration could not be reached. Check your connection and try again.",
      );
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
          ? "The verification email could not be resent just now. Please try again shortly."
          : "A fresh verification email is on its way. The newest link replaces earlier ones.",
      );
    } catch {
      setResendStatus(
        "The verification email could not be resent just now. Please try again shortly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className={styles.form}>
        <p className={styles.status} role="status">
          Nearly there. We have sent a verification link to{" "}
          <strong>{registeredEmail}</strong>. Select it within 24 hours to
          unlock your account, then sign in.
        </p>
        <button
          type="button"
          className={styles.linkButton}
          onClick={resendVerification}
          disabled={isSubmitting}
        >
          Resend the verification email
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
        <label htmlFor={`${idPrefix}-name`}>Your name</label>
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
        <label htmlFor={`${idPrefix}-email`}>Email address</label>
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
        <label htmlFor={`${idPrefix}-password`}>Choose a password</label>
        <input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={isSubmitting}
          aria-describedby={hasError ? errorId : undefined}
          onInput={clearFeedback}
        />
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
          I confirm the information I add will be accurate and I accept the
          OurValleys terms of use.
        </span>
      </label>

      <label className={styles.remember} htmlFor={`${idPrefix}-marketing`}>
        <input
          id={`${idPrefix}-marketing`}
          name="marketingOptIn"
          type="checkbox"
          disabled={isSubmitting}
        />
        <span>
          Send me occasional OurValleys product news. I can opt out at any time.
        </span>
      </label>

      {errorMessage ? (
        <p className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating your account…" : "Create your free account"}
      </button>
    </form>
  );
}
