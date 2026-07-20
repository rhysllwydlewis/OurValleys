"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./sign-in-form.module.css";

type PublicDemoCredentials = {
  email: string;
  password: string;
  notice: string;
};

type SignInFormProps = {
  idPrefix: string;
  returnTo: string;
  autoFocus?: boolean;
  onSuccess?: () => void;
  publicDemo?: PublicDemoCredentials;
};

function isCredentialError(status: number | undefined): boolean {
  return status === 400 || status === 401 || status === 403;
}

function getSignInErrorMessage(status: number | undefined): string {
  if (isCredentialError(status)) {
    return "The email address or password is incorrect, or this account is not ready to sign in.";
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
  publicDemo,
}: SignInFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [demoStatus, setDemoStatus] = useState("");
  const errorId = `${idPrefix}-error`;
  const demoStatusId = `${idPrefix}-demo-status`;
  const hasError = Boolean(errorMessage);

  function clearError() {
    if (errorMessage) setErrorMessage(null);
    if (invalidCredentials) setInvalidCredentials(false);
  }

  function fillPublicDemo() {
    if (!publicDemo || !formRef.current) return;
    const email = formRef.current.elements.namedItem("email");
    const password = formRef.current.elements.namedItem("password");
    if (!(email instanceof HTMLInputElement)) return;
    if (!(password instanceof HTMLInputElement)) return;

    email.value = publicDemo.email;
    password.value = publicDemo.password;
    clearError();
    setDemoStatus("Demo details added. Review them, then select Sign in.");
    password.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInvalidCredentials(false);
    setDemoStatus("");
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
        setInvalidCredentials(isCredentialError(result.error.status));
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
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
    >
      {publicDemo ? (
        <aside className={styles.demo} aria-labelledby={`${idPrefix}-demo-title`}>
          <p className={styles.demoEyebrow}>Public demonstration</p>
          <h2 id={`${idPrefix}-demo-title`}>View the fictional business dashboard</h2>
          <p>{publicDemo.notice}</p>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{publicDemo.email}</dd>
            </div>
            <div>
              <dt>Password</dt>
              <dd>{publicDemo.password}</dd>
            </div>
          </dl>
          <button type="button" onClick={fillPublicDemo} disabled={isSubmitting}>
            Fill demo details
          </button>
          <p id={demoStatusId} className={styles.srStatus} aria-live="polite">
            {demoStatus}
          </p>
        </aside>
      ) : null}

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
          autoFocus={autoFocus}
          disabled={isSubmitting}
          aria-invalid={invalidCredentials}
          aria-describedby={
            hasError ? errorId : publicDemo ? demoStatusId : undefined
          }
          onInput={clearError}
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
          disabled={isSubmitting}
          aria-invalid={invalidCredentials}
          aria-describedby={
            hasError ? errorId : publicDemo ? demoStatusId : undefined
          }
          onInput={clearError}
        />
      </div>

      <label className={styles.remember} htmlFor={`${idPrefix}-remember`}>
        <input
          id={`${idPrefix}-remember`}
          name="rememberMe"
          type="checkbox"
          defaultChecked
          disabled={isSubmitting}
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
