"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./sign-in-form.module.css";

type SignInFormProps = {
  idPrefix: string;
  returnTo: string;
  autoFocus?: boolean;
  onSuccess?: () => void;
};

function getSignInErrorMessage(status: number | undefined): string {
  if (status === 400 || status === 401) {
    return "The email address or password is incorrect.";
  }

  if (status === 403) {
    return "This account cannot sign in yet. Check whether the email address needs verification.";
  }

  if (status === 429) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }

  if (status === 503) {
    return "Sign-in is temporarily unavailable. Public browsing still works without an account.";
  }

  return "We could not sign you in. Please check your details and try again.";
}

export function SignInForm({
  idPrefix,
  returnTo,
  autoFocus = false,
  onSuccess,
}: SignInFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorId = `${idPrefix}-error`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const rememberMe = formData.get("rememberMe") === "on";

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      });

      if (result.error) {
        setErrorMessage(getSignInErrorMessage(result.error.status));
        return;
      }

      onSuccess?.();
      window.location.assign(returnTo);
    } catch {
      setErrorMessage(
        "Sign-in could not be reached. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate={false}>
      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-email`}>Email address</label>
        <input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          autoFocus={autoFocus}
          aria-describedby={errorMessage ? errorId : undefined}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-password`}>Password</label>
        <input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          maxLength={128}
          required
          aria-describedby={errorMessage ? errorId : undefined}
        />
      </div>

      <label className={styles.remember} htmlFor={`${idPrefix}-remember`}>
        <input
          id={`${idPrefix}-remember`}
          name="rememberMe"
          type="checkbox"
          defaultChecked
        />
        <span>Keep me signed in on this device</span>
      </label>

      {errorMessage ? (
        <p className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
