"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
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
};

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
        : t("auth.form.demoAddedLabelled", { label: publicDemo.label }),
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
    const rememberMe =
      !isPublicDemoEmail(email) && formData.get("rememberMe") === "on";

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
          getSignInErrorMessage(t, result.error.status, result.error.code),
        );
        return;
      }

      if (result.data && "twoFactorRedirect" in result.data) {
        setNeedsSecondStep(true);
        return;
      }

      onSuccess?.();
      window.location.assign(selectedDemoReturnTo ?? returnTo);
    } catch {
      setErrorMessage(t("auth.form.errNetwork"));
    } finally {
      setIsSubmitting(false);
    }
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
        setErrorMessage(
          result.error.status === 429
            ? t("auth.attemptsLimit")
            : t("auth.form.errCode"),
        );
        return;
      }

      onSuccess?.();
      window.location.assign(returnTo);
    } catch {
      setErrorMessage(t("auth.form.errVerifyNetwork"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsSecondStep) {
    const codeFieldId = `${idPrefix}-second-step-code`;
    return (
      <form
        className={styles.form}
        onSubmit={handleSecondStep}
        aria-busy={isSubmitting}
      >
        <div className={styles.field}>
          <label htmlFor={codeFieldId}>
            {useRecoveryCode
              ? t("auth.form.recoveryCode")
              : t("auth.form.authenticatorCode")}
          </label>
          <input
            id={codeFieldId}
            name="code"
            type="text"
            inputMode={useRecoveryCode ? "text" : "numeric"}
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            required
            autoFocus
            disabled={isSubmitting}
            aria-describedby={hasError ? errorId : undefined}
          />
        </div>

        {errorMessage ? (
          <p className={styles.error} id={errorId} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button className={styles.submit} type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t("auth.form.checking")
            : t("auth.form.verifyAndSignIn")}
        </button>
        <button
          type="button"
          className={styles.linkButton}
          disabled={isSubmitting}
          onClick={() => {
            setUseRecoveryCode((value) => !value);
            setErrorMessage(null);
          }}
        >
          {useRecoveryCode
            ? t("auth.form.useAuthenticator")
            : t("auth.form.useRecovery")}
        </button>
      </form>
    );
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
              data-privileged={publicDemo.key !== "viewer" ? "true" : undefined}
              aria-labelledby={`${idPrefix}-${publicDemo.key}-demo-title`}
            >
              <p className={styles.demoEyebrow}>
                {t("auth.form.demoSuffix", { label: publicDemo.label })}
              </p>
              <h2 id={`${idPrefix}-${publicDemo.key}-demo-title`}>
                {publicDemo.title}
              </h2>
              <p>{publicDemo.notice}</p>
              <dl>
                <div>
                  <dt>{t("auth.form.demoEmail")}</dt>
                  <dd>{publicDemo.email}</dd>
                </div>
                <div>
                  <dt>{t("auth.form.demoPassword")}</dt>
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
          disabled={isSubmitting}
          aria-invalid={invalidCredentials}
          aria-describedby={
            hasError ? errorId : hasPublicDemos ? demoStatusId : undefined
          }
          onInput={clearFeedback}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${idPrefix}-password`}>
          {t("auth.passwordLabel")}
        </label>
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
            disabled={isSubmitting}
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

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("auth.form.signingIn") : t("auth.form.signIn")}
      </button>
    </form>
  );
}
