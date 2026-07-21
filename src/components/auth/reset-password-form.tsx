"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import styles from "./sign-in-form.module.css";

type ResetPasswordFormProps = {
  idPrefix: string;
  token: string;
};

function getResetErrorMessage(status: number | undefined): string {
  if (status === 400 || status === 401 || status === 403) {
    return "This reset link is no longer valid. Request a fresh link and use it within one hour.";
  }

  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return "We could not reset your password. Please try again.";
}

export function ResetPasswordForm({ idPrefix, token }: ResetPasswordFormProps) {
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
      setErrorMessage("The two passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authClient.resetPassword({ newPassword, token });

      if (result.error) {
        setErrorMessage(getResetErrorMessage(result.error.status));
        return;
      }

      setIsComplete(true);
    } catch {
      setErrorMessage(
        "The reset could not be reached. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className={styles.form}>
        <p className={styles.status} role="status">
          Your password has been changed. Sign in with your new password to
          continue.
        </p>
        <Link className={styles.linkButton} href="/login">
          Go to sign in
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
        <label htmlFor={`${idPrefix}-new-password`}>New password</label>
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
          aria-describedby={errorMessage ? errorId : undefined}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-confirm-password`}>
          Confirm new password
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
        {isSubmitting ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
