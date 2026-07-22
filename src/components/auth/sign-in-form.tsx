"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import type { PublicDemoAccount } from "@/lib/demo-account";
import styles from "./sign-in-form.module.css";

type SignInFormProps = {
  idPrefix: string;
  returnTo: string;
  autoFocus?: boolean;
  onSuccess?: () => void;
  publicDemos?: readonly PublicDemoAccount[];
};

function isCredentialError(status: number | undefined): boolean {
  return status === 400 || status === 401 || status === 403;
}

function getSignInErrorMessage(
  status: number | undefined,
  code: string | undefined,
): string {
  if (code === "EMAIL_NOT_VERIFIED") {
    return "This account's email address has not been verified yet. Use the link in your verification email, or request a fresh link below.";
  }

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
  publicDemos,
}: SignInFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [demoStatus, setDemoStatus] = useState("");
  const [selectedDemoReturnTo, setSelectedDemoReturnTo] = useState<
    string | null
  >(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState("");
  const errorId = `${idPrefix}-error`;
  const demoStatusId = `${idPrefix}-demo-status`;
  const verificationStatusId = `${idPrefix}-verification-status`;
  const hasError = Boolean(errorMessage);
  const hasPublicDemos = Boolean(publicDemos?.length);

  function clearFeedback() {
    if (errorMessage) setErrorMessage(null);
    if (invalidCredentials) setInvalidCredentials(false);
    if (demoStatus) setDemoStatus("");
    if (selectedDemoReturnTo) setSelectedDemoReturnTo(null);
    if (unverifiedEmail) setUnverifiedEmail(null);
    if (verificationStatus) setVerificationStatus("");
  }

  function fillPublicDemo(publicDemo: PublicDemoAccount) {
    if (!formRef.current) return;
    const email = formRef.current.elements.namedItem("email");
    const password = formRef.current.elements.namedItem("password");
    if (!(email instanceof HTMLInputElement)) return;
    if (!(password instanceof HTMLInputElement)) return;

    email.value = publicDemo.email;
    password.value = publicDemo.password;
    clearFeedback();
    setSelectedDemoReturnTo(publicDemo.returnTo);
    setDemoStatus(
      publicDemo.key === "viewer"
        ? "Demo details added. Review them, then select Sign in."
        : `${publicDemo.label} demo details added. Review them, then select Sign in.`,
    );
    password.focus();
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    setVerificationStatus("");
    setIsSubmitting(true);

    try {
      const result = await authClient.sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: returnTo,
      });
      setVerificationStatus(
        result.error
          ? "The verification email could not be resent just now. Please try again shortly."
          : "A fresh verification email is on its way. Use the newest link within 24 hours.",
      );
    } catch {
      setVerificationStatus(
        "The verification email could not be resent just now. Please try again shortly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInvalidCredentials(false);
    setDemoStatus("");
    setUnverifiedEmail(null);
    setVerificationStatus("");
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
        const needsVerification = result.error.code === "EMAIL_NOT_VERIFIED";
        setInvalidCredentials(
          !needsVerification && isCredentialError(result.error.status),
        );
        setUnverifiedEmail(needsVerification ? email : null);
        setErrorMessage(
          getSignInErrorMessage(result.error.status, result.error.code),
        );
        return;
      }

      onSuccess?.();
      window.location.assign(selectedDemoReturnTo ?? returnTo);
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
      {hasPublicDemos ? (
        <div className={styles.demoList}>
          {publicDemos?.map((publicDemo) => (
            <aside
              key={publicDemo.key}
              className={styles.demo}
              aria-labelledby={`${idPrefix}-${publicDemo.key}-demo-title`}
            >
              <p className={styles.demoEyebrow}>
                {publicDemo.label} demonstration
              </p>
              <h2 id={`${idPrefix}-${publicDemo.key}-demo-title`}>
                {publicDemo.title}
              </h2>
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
              <button
                type="button"
                onClick={() => fillPublicDemo(publicDemo)}
                disabled={isSubmitting}
              >
                {publicDemo.buttonLabel}
              </button>
            </aside>
          ))}
          <p id={demoStatusId} className={styles.srStatus} aria-live="polite">
            {demoStatus}
          </p>
        </div>
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
            hasError ? errorId : hasPublicDemos ? demoStatusId : undefined
          }
          onInput={clearFeedback}
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
            hasError ? errorId : hasPublicDemos ? demoStatusId : undefined
          }
          onInput={clearFeedback}
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

      {unverifiedEmail ? (
        <>
          <button
            type="button"
            className={styles.linkButton}
            onClick={resendVerification}
            disabled={isSubmitting}
            aria-describedby={verificationStatusId}
          >
            Resend verification email
          </button>
          <p
            id={verificationStatusId}
            className={styles.srStatus}
            role="status"
            aria-live="polite"
          >
            {verificationStatus}
          </p>
          {verificationStatus ? (
            <p className={styles.status}>{verificationStatus}</p>
          ) : null}
        </>
      ) : null}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
