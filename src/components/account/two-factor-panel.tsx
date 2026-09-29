"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account-settings.module.css";

type TwoFactorPanelProps = {
  initialEnabled: boolean;
  required: boolean;
};

type Setup = { secret: string; uri: string; backupCodes: string[] };

/** The base32 shared secret is carried in the otpauth URI's `secret` param. */
function readSecret(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

export function TwoFactorPanel({
  initialEnabled,
  required,
}: TwoFactorPanelProps) {
  const passwordId = useId();
  const codeId = useId();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  function fail(message: string) {
    setFeedback({ message, isError: true });
  }

  async function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    setIsBusy(true);
    setFeedback(null);

    try {
      const result = await authClient.twoFactor.enable({ password });
      if (result.error || !result.data) {
        fail(
          result.error?.status === 400
            ? "That password is incorrect."
            : "We could not start setup. Please try again.",
        );
        return;
      }
      setSetup({
        secret: readSecret(result.data.totpURI),
        uri: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      });
      form.reset();
    } catch {
      fail("Setup could not be reached. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup) return;
    const code = String(new FormData(event.currentTarget).get("code") ?? "")
      .replace(/\s+/g, "")
      .trim();
    setIsBusy(true);
    setFeedback(null);

    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        fail("That code is not right. Check your authenticator and try again.");
        return;
      }
      setEnabled(true);
      setRecoveryCodes(setup.backupCodes);
      setSetup(null);
      setFeedback({
        message: "Two-step verification is now on for your account.",
        isError: false,
      });
    } catch {
      fail("Verification could not be reached. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  async function turnOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    setIsBusy(true);
    setFeedback(null);

    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        fail(
          result.error.status === 400
            ? "That password is incorrect."
            : "We could not turn off two-step verification. Please try again.",
        );
        return;
      }
      setEnabled(false);
      setRecoveryCodes(null);
      form.reset();
      setFeedback({
        message: "Two-step verification is off.",
        isError: false,
      });
    } catch {
      fail("The request could not be reached. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={styles.card}>
      {required && !enabled ? (
        <p className={`${styles.feedback} ${styles.feedbackError}`} role="note">
          Platform admins must turn on two-step verification before using the
          admin area.
        </p>
      ) : null}

      {recoveryCodes ? (
        <div className={styles.formGrid}>
          <h3>Save your recovery codes</h3>
          <p className={styles.fieldHint}>
            Each code works once if you lose access to your authenticator app.
            Store them somewhere safe. They will not be shown again.
          </p>
          <ul aria-label="Recovery codes">
            {recoveryCodes.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.submit}
              onClick={() => setRecoveryCodes(null)}
            >
              I have saved these codes
            </button>
          </div>
        </div>
      ) : setup ? (
        <form className={styles.formGrid} onSubmit={confirm}>
          <h3>Add OurValleys to your authenticator app</h3>
          <p className={styles.fieldHint}>
            In an authenticator app, choose to add an account manually and enter
            this setup key. Then type the 6-digit code it shows.
          </p>
          <p>
            <code aria-label="Setup key">{setup.secret}</code>
          </p>
          <div className={styles.field}>
            <label htmlFor={codeId}>6-digit code</label>
            <input
              id={codeId}
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              disabled={isBusy}
            />
          </div>
          <div className={styles.actionsRow}>
            <button className={styles.submit} type="submit" disabled={isBusy}>
              {isBusy ? "Checking…" : "Turn on two-step verification"}
            </button>
          </div>
        </form>
      ) : (
        <form className={styles.formGrid} onSubmit={enabled ? turnOff : begin}>
          <h3>
            {enabled
              ? "Two-step verification is on"
              : "Two-step verification is off"}
          </h3>
          <p className={styles.fieldHint}>
            {enabled
              ? "You will be asked for a code from your authenticator app when you sign in. Enter your password to turn it off."
              : "Add a second step at sign-in using an authenticator app. Enter your password to begin."}
          </p>
          <div className={styles.field}>
            <label htmlFor={passwordId}>Password</label>
            <input
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isBusy}
            />
          </div>
          <div className={styles.actionsRow}>
            {enabled ? (
              <button
                className={styles.dangerButton}
                type="submit"
                disabled={isBusy}
              >
                Turn off two-step verification
              </button>
            ) : (
              <button className={styles.submit} type="submit" disabled={isBusy}>
                {isBusy ? "Starting…" : "Set up two-step verification"}
              </button>
            )}
          </div>
        </form>
      )}

      {feedback ? (
        <p
          className={`${styles.feedback} ${feedback.isError ? styles.feedbackError : styles.feedbackSuccess}`}
          role={feedback.isError ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
