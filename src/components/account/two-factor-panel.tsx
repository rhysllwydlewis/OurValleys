"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
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
  const t = useT();
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
            ? t("accountForm.wrongPassword")
            : t("twoFactor.startFailed"),
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
      fail(t("twoFactor.startUnreachable"));
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
        fail(t("twoFactor.wrongCode"));
        return;
      }
      setEnabled(true);
      setRecoveryCodes(setup.backupCodes);
      setSetup(null);
      setFeedback({
        message: t("twoFactor.nowOn"),
        isError: false,
      });
    } catch {
      fail(t("twoFactor.verifyUnreachable"));
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
            ? t("accountForm.wrongPassword")
            : t("twoFactor.offFailed"),
        );
        return;
      }
      setEnabled(false);
      setRecoveryCodes(null);
      form.reset();
      setFeedback({
        message: t("twoFactor.isOff"),
        isError: false,
      });
    } catch {
      fail(t("twoFactor.offUnreachable"));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={styles.card}>
      {required && !enabled ? (
        <p className={`${styles.feedback} ${styles.feedbackError}`} role="note">
          {t("twoFactor.required")}
        </p>
      ) : null}

      {recoveryCodes ? (
        <div className={styles.formGrid}>
          <h3>{t("twoFactor.recoveryTitle")}</h3>
          <p className={styles.fieldHint}>{t("twoFactor.recoveryBody")}</p>
          <ul aria-label={t("twoFactor.recoveryList")}>
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
              {t("twoFactor.recoverySaved")}
            </button>
          </div>
        </div>
      ) : setup ? (
        <form className={styles.formGrid} onSubmit={confirm}>
          <h3>{t("twoFactor.setupTitle")}</h3>
          <p className={styles.fieldHint}>{t("twoFactor.setupBody")}</p>
          <p>
            <code aria-label={t("twoFactor.setupKey")}>{setup.secret}</code>
          </p>
          <div className={styles.field}>
            <label htmlFor={codeId}>{t("twoFactor.codeLabel")}</label>
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
              {isBusy ? t("twoFactor.checking") : t("twoFactor.turnOn")}
            </button>
          </div>
        </form>
      ) : (
        <form className={styles.formGrid} onSubmit={enabled ? turnOff : begin}>
          <h3>{enabled ? t("twoFactor.onTitle") : t("twoFactor.offTitle")}</h3>
          <p className={styles.fieldHint}>
            {enabled ? t("twoFactor.onBody") : t("twoFactor.offBody")}
          </p>
          <div className={styles.field}>
            <label htmlFor={passwordId}>{t("accountForm.password")}</label>
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
                {t("twoFactor.turnOff")}
              </button>
            ) : (
              <button className={styles.submit} type="submit" disabled={isBusy}>
                {isBusy ? t("twoFactor.starting") : t("twoFactor.setUp")}
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
