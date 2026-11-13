"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
import type { Translator } from "@/lib/i18n/translate";
import type { PublicDemoAccount } from "@/lib/demo-account";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import styles from "./sign-in-form.module.css";

type SignInFormProps = {
  idPrefix: string;
  returnTo: string;
  autoFocus?: boolean;
  onSuccess?: () => void;
  publicDemos?: readonly PublicDemoAccount[];
  /** Where "Forgotten it?" beside the password leads; omitted hides the link. */
  forgotHref?: string;
};

function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

function isCredentialError(status: number | undefined): boolean {
  return status === 400 || status === 401 || status === 403;
}

function getSignInErrorMessage(
  t: Translator,
  status: number | undefined,
  code: string | undefined,
): string {
  if (code === "EMAIL_NOT_VERIFIED") {
    return t("auth.form.errUnverified");
  }

  if (isCredentialError(status)) {
    return t("auth.form.errCredentials");
  }

  if (status === 429) {
    return t("auth.form.errRate");
  }

  if (status === 503) {
    return t("auth.form.errUnavailable");
  }

  return t("auth.form.errGeneric");
}

export function SignInForm({
  idPrefix,
  returnTo,
  autoFocus = false,
  onSuccess,
  publicDemos,
  forgotHref,
}: SignInFormProps) {
  const t = useT();
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
  const [needsSecondStep, setNeedsSecondStep] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [chosenDemoKey, setChosenDemoKey] = useState<
    PublicDemoAccount["key"] | null
  >(null);
  const errorId = `${idPrefix}-error`;
  const demoStatusId = `${idPrefix}-demo-status`;
  const verificationStatusId = `${idPrefix}-verification-status`;
  const hasError = Boolean(errorMessage);
  const hasPublicDemos = Boolean(publicDemos?.length);
  const capsLockId = `${idPrefix}-caps-lock`;
  const demoHeadingId = `${idPrefix}-demo-heading`;
  const shownDemo =
    publicDemos?.find((candidate) => candidate.key === chosenDemoKey) ??
    publicDemos?.[0] ??
    null;

  // Coming back with the Back button can restore this page exactly as it was
  // left, mid-"taking you there"; unlock the form again when that happens.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      setIsLeaving(false);
      setIsSubmitting(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  function trackCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    // Some synthetic key events (autofill) carry no modifier state.
    if (typeof event.getModifierState !== "function") return;
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  /** Stay busy while the browser loads the next page, so nothing is re-sent. */
  function leaveFor(destination: string) {
    setIsLeaving(true);
    onSuccess?.();
    window.location.assign(destination);
  }

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
    const rememberMe = formRef.current.elements.namedItem("rememberMe");
    if (!(email instanceof HTMLInputElement)) return;
    if (!(password instanceof HTMLInputElement)) return;

    email.value = publicDemo.email;
    password.value = publicDemo.password;
    if (rememberMe instanceof HTMLInputElement) rememberMe.checked = false;
    clearFeedback();
    setSelectedDemoReturnTo(publicDemo.returnTo);
    setDemoStatus(
      publicDemo.key === "viewer"
        ? t("auth.form.demoAdded")
        : t("auth.form.demoAddedLabelled", {
            label: t(`settings.demo.kind.${publicDemo.key}`),
          }),
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
          ? t("auth.form.resendFailed")
          : t("auth.form.resendOkSignIn"),
      );
    } catch {
      setVerificationStatus(t("auth.form.resendFailed"));
    }
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInvalidCredentials(false);
    setDemoStatus("");
    setUnverifiedEmail(null);
    setVerificationStatus("");
    setShowPassword(false);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const rememberMe =
      !isPublicDemoEmail(email) && formData.get("rememberMe") === "on";

    try {
      const result = await authClient.signIn.email({
        email,
        password,
        rememberMe,
      });

      if (result.error) {
        setIsSubmitting(false);
        const needsVerification = result.error.code === "EMAIL_NOT_VERIFIED";
        setInvalidCredentials(
          !needsVerification && isCredentialError(result.error.status),
        );
        setUnverifiedEmail(needsVerification ? email : null);
        setErrorMessage(
          getSignInErrorMessage(t, result.error.status, result.error.code),
        );
        return;
      }

      if (result.data && "twoFactorRedirect" in result.data) {
        setIsSubmitting(false);
        setShowPassword(false);
        setNeedsSecondStep(true);
        return;
      }

      leaveFor(selectedDemoReturnTo ?? returnTo);
      return;
    } catch {
      setErrorMessage(t("auth.form.errNetwork"));
    }
    setIsSubmitting(false);
  }

  async function handleSecondStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const code = String(new FormData(event.currentTarget).get("code") ?? "")
      .replace(/\s+/g, "")
      .trim();

    try {
      const result = useRecoveryCode
        ? await authClient.twoFactor.verifyBackupCode({ code })
        : await authClient.twoFactor.verifyTotp({ code });

      if (result.error) {
        setIsSubmitting(false);
        setErrorMessage(
          result.error.status === 429
            ? t("auth.attemptsLimit")
            : t("auth.form.errCode"),
        );
        return;
      }

      leaveFor(returnTo);
      return;
    } catch {
      setErrorMessage(t("auth.form.errVerifyNetwork"));
    }
    setIsSubmitting(false);
  }

  const busy = isSubmitting || isLeaving;

  if (needsSecondStep) {
    const codeFieldId = `${idPrefix}-second-step-code`;
    const leadId = `${idPrefix}-second-step-lead`;
    return (
      <form
        className={styles.form}
        onSubmit={handleSecondStep}
        aria-busy={busy}
      >
        <div className={styles.stepIntro}>
          <span className={styles.stepMark} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3.5 5 6.4v5.1c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6.4l-7-2.9Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2.2 2.2L15.2 10"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h2>{t("signin.secondTitle")}</h2>
            <p id={leadId}>
              {useRecoveryCode
                ? t("signin.secondRecoveryLead")
                : t("signin.secondLead")}
            </p>
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor={codeFieldId}>
            {useRecoveryCode
              ? t("auth.form.recoveryCode")
              : t("auth.form.authenticatorCode")}
          </label>
          <input
            // Remount on switching so a half-typed code never carries over.
            key={useRecoveryCode ? "recovery" : "totp"}
            id={codeFieldId}
            className={useRecoveryCode ? undefined : styles.codeInput}
            name="code"
            type="text"
            inputMode={useRecoveryCode ? "text" : "numeric"}
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            required
            autoFocus
            disabled={busy}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${errorId} ${leadId}` : leadId}
          />
        </div>

        {errorMessage ? (
          <p className={styles.error} id={errorId} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? <Spinner /> : null}
          {isLeaving
            ? t("signin.redirecting")
            : isSubmitting
              ? t("auth.form.checking")
              : t("auth.form.verifyAndSignIn")}
        </button>
        <div className={styles.stepLinks}>
          <button
            type="button"
            className={styles.linkButton}
            disabled={busy}
            onClick={() => {
              setUseRecoveryCode((value) => !value);
              setErrorMessage(null);
            }}
          >
            {useRecoveryCode
              ? t("auth.form.useAuthenticator")
              : t("auth.form.useRecovery")}
          </button>
          <button
            type="button"
            className={styles.linkButton}
            disabled={busy}
            onClick={() => {
              setNeedsSecondStep(false);
              setUseRecoveryCode(false);
              setErrorMessage(null);
            }}
          >
            {t("signin.secondBack")}
          </button>
        </div>
      </form>
    );
  }

  const describedBy =
    [
      hasError ? errorId : null,
      !hasError && hasPublicDemos ? demoStatusId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={handleSubmit}
      aria-busy={busy}
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
          autoFocus={autoFocus}
          disabled={busy}
          aria-invalid={invalidCredentials}
          aria-describedby={describedBy}
          onInput={clearFeedback}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.labelRow}>
          <label htmlFor={`${idPrefix}-password`}>
            {t("auth.passwordLabel")}
          </label>
          {forgotHref ? (
            <Link className={styles.forgot} href={forgotHref as Route}>
              {t("auth.login.forgotten")}
            </Link>
          ) : null}
        </div>
        <div className={styles.passwordWrap}>
          <input
            id={`${idPrefix}-password`}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            minLength={8}
            maxLength={128}
            required
            disabled={busy}
            aria-invalid={invalidCredentials}
            aria-describedby={
              [describedBy, capsLockOn ? capsLockId : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onInput={clearFeedback}
            onKeyDown={trackCapsLock}
            onKeyUp={trackCapsLock}
            onBlur={() => setCapsLockOn(false)}
          />
          <button
            type="button"
            className={styles.reveal}
            aria-label={
              showPassword ? t("signin.hideAria") : t("signin.showAria")
            }
            aria-pressed={showPassword}
            aria-controls={`${idPrefix}-password`}
            disabled={busy}
            onClick={() => setShowPassword((shown) => !shown)}
          >
            {showPassword ? t("signin.hide") : t("signin.show")}
          </button>
        </div>
        {/* Always in the page so the announcement is made when it fills. */}
        <p
          id={capsLockId}
          className={capsLockOn ? styles.capsLock : styles.srStatus}
          role="status"
        >
          {capsLockOn ? t("signin.capsLock") : ""}
        </p>
      </div>

      <label className={styles.remember} htmlFor={`${idPrefix}-remember`}>
        <input
          id={`${idPrefix}-remember`}
          name="rememberMe"
          type="checkbox"
          defaultChecked
          disabled={busy}
        />
        <span>{t("auth.form.keepSignedIn")}</span>
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
            disabled={busy}
            aria-describedby={verificationStatusId}
          >
            {t("auth.form.resendVerification")}
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

      <button className={styles.submit} type="submit" disabled={busy}>
        {busy ? <Spinner /> : null}
        {isLeaving
          ? t("signin.redirecting")
          : isSubmitting
            ? t("auth.form.signingIn")
            : t("auth.form.signIn")}
      </button>

      {shownDemo && publicDemos ? (
        <section className={styles.demos} aria-labelledby={demoHeadingId}>
          {/* One account needs no introduction: its card says what it is. */}
          {publicDemos.length > 1 ? (
            <div className={styles.demosHead}>
              <h2 id={demoHeadingId}>{t("signin.demoHeading")}</h2>
              <p>{t("signin.demoLead")}</p>
            </div>
          ) : null}

          {publicDemos.length > 1 ? (
            <fieldset className={styles.demoChooser} disabled={busy}>
              <legend className={styles.srStatus}>
                {t("signin.demoChoose")}
              </legend>
              {publicDemos.map((publicDemo) => (
                <label key={publicDemo.key}>
                  <input
                    type="radio"
                    // Not part of what is submitted: the form reads only the
                    // email, password and remember-me fields.
                    name={`${idPrefix}-demo-choice`}
                    value={publicDemo.key}
                    checked={publicDemo.key === shownDemo.key}
                    onChange={() => setChosenDemoKey(publicDemo.key)}
                  />
                  <span>{t(`settings.demo.kind.${publicDemo.key}`)}</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          <div
            className={styles.demo}
            data-privileged={shownDemo.key !== "viewer" ? "true" : undefined}
            data-demo={shownDemo.key}
          >
            <p className={styles.demoEyebrow}>
              {t("auth.form.demoSuffix", {
                label: t(`settings.demo.kind.${shownDemo.key}`),
              })}
            </p>
            {publicDemos.length > 1 ? (
              <h3 lang="en-GB">{shownDemo.title}</h3>
            ) : (
              <h2 id={demoHeadingId} lang="en-GB">
                {shownDemo.title}
              </h2>
            )}
            <p className={styles.demoNotice} lang="en-GB">
              {shownDemo.notice}
            </p>
            <dl>
              <div>
                <dt>{t("auth.form.demoEmail")}</dt>
                <dd>
                  {/* On a narrow card the address wraps after the "@",
                      never in the middle of a word. */}
                  {shownDemo.email.split("@")[0]}@<wbr />
                  {shownDemo.email.split("@").slice(1).join("@")}
                </dd>
              </div>
              <div>
                <dt>{t("auth.form.demoPassword")}</dt>
                <dd>{shownDemo.password}</dd>
              </div>
            </dl>
            <button
              type="button"
              lang="en-GB"
              onClick={() => fillPublicDemo(shownDemo)}
              disabled={busy}
            >
              {shownDemo.buttonLabel}
            </button>
          </div>
          <p id={demoStatusId} className={styles.demoStatus} role="status">
            {demoStatus}
          </p>
        </section>
      ) : null}
    </form>
  );
}
