"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/lib/i18n/client";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import styles from "./account-settings.module.css";

const confirmationPhrase = "DELETE";

export function DeleteAccountPanel() {
  const { t } = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const previousBodyOverflowRef = useRef("");
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The block-by-sole-owner message comes from the server in English.
  const [errorFromServer, setErrorFromServer] = useState(false);
  const passwordId = useId();
  const confirmationId = useId();
  const errorId = useId();

  function resetForm() {
    setPassword("");
    setConfirmationText("");
    setErrorMessage(null);
    setErrorFromServer(false);
  }

  function openDialog() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    resetForm();
    previousBodyOverflowRef.current = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
    window.setTimeout(() => passwordInputRef.current?.focus(), 0);
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleDialogClosed() {
    document.documentElement.style.overflow = previousBodyOverflowRef.current;
    triggerRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmationText !== confirmationPhrase) {
      setErrorFromServer(false);
      setErrorMessage(
        t("deleteAccount.typeError", { phrase: confirmationPhrase }),
      );
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    setErrorFromServer(false);

    try {
      const result = await authClient.deleteUser({ password });

      if (result.error) {
        const serverMessage =
          result.error.code === "SOLE_BUSINESS_OWNER" && result.error.message
            ? result.error.message
            : null;
        setErrorFromServer(Boolean(serverMessage));
        setErrorMessage(
          serverMessage ??
            (result.error.status === 400
              ? t("accountForm.wrongPassword")
              : t("deleteAccount.failed")),
        );
        return;
      }

      window.location.assign("/");
    } catch {
      setErrorMessage(t("deleteAccount.unreachable"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={`${styles.card} ${styles.dangerCard}`}>
      <p className={styles.dangerIntro}>{t("deleteAccount.intro")}</p>
      <button
        ref={triggerRef}
        type="button"
        className={styles.dangerButton}
        onClick={openDialog}
      >
        {t("deleteAccount.open")}
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="delete-account-title"
        onClose={handleDialogClosed}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <div className={styles.dialogCard}>
          <button
            type="button"
            className={styles.dialogClose}
            onClick={closeDialog}
            aria-label={t("deleteAccount.close")}
          >
            ×
          </button>
          <h2 id="delete-account-title">{t("deleteAccount.dialogTitle")}</h2>
          <p className={styles.dialogLead}>
            {t("deleteAccount.dialogLead", { phrase: confirmationPhrase })}
          </p>

          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor={passwordId}>{t("accountForm.password")}</label>
              <input
                ref={passwordInputRef}
                id={passwordId}
                type="password"
                autoComplete="current-password"
                required
                disabled={isDeleting}
                value={password}
                aria-describedby={errorMessage ? errorId : undefined}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={confirmationId}>
                {t("deleteAccount.typeLabel", { phrase: confirmationPhrase })}
              </label>
              <input
                id={confirmationId}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                required
                disabled={isDeleting}
                value={confirmationText}
                aria-describedby={errorMessage ? errorId : undefined}
                onChange={(event) => setConfirmationText(event.target.value)}
              />
            </div>

            {errorMessage ? (
              <p
                className={styles.feedbackError}
                id={errorId}
                role="alert"
                lang={errorFromServer ? LOCALE_DETAILS.en.htmlLang : undefined}
              >
                {errorMessage}
              </p>
            ) : null}

            <div className={styles.actionsRow}>
              <button
                type="submit"
                className={styles.dangerButton}
                disabled={
                  isDeleting ||
                  !password ||
                  confirmationText !== confirmationPhrase
                }
              >
                {isDeleting
                  ? t("deleteAccount.deleting")
                  : t("deleteAccount.confirm")}
              </button>
              <button type="button" onClick={closeDialog} disabled={isDeleting}>
                {t("deleteAccount.cancel")}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
