"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account-settings.module.css";

const confirmationPhrase = "DELETE";

export function DeleteAccountPanel() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const previousBodyOverflowRef = useRef("");
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordId = useId();
  const confirmationId = useId();
  const errorId = useId();

  function resetForm() {
    setPassword("");
    setConfirmationText("");
    setErrorMessage(null);
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
      setErrorMessage(`Type ${confirmationPhrase} to confirm.`);
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await authClient.deleteUser({ password });

      if (result.error) {
        setErrorMessage(
          result.error.status === 400
            ? "That password is incorrect."
            : "We could not delete your account. Please try again.",
        );
        return;
      }

      window.location.assign("/");
    } catch {
      setErrorMessage(
        "Account deletion could not be reached. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={`${styles.card} ${styles.dangerCard}`}>
      <p className={styles.dangerIntro}>
        Deleting your account permanently removes your profile and signs you out
        everywhere. Any businesses you manage stay intact for other members;
        this only removes your own access. This cannot be undone.
      </p>
      <button
        ref={triggerRef}
        type="button"
        className={styles.dangerButton}
        onClick={openDialog}
      >
        Delete account
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
            aria-label="Close delete account dialog"
          >
            ×
          </button>
          <h2 id="delete-account-title">Delete your account?</h2>
          <p className={styles.dialogLead}>
            This permanently deletes your OurValleys account. Enter your
            password and type {confirmationPhrase} to confirm.
          </p>

          <form className={styles.formGrid} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor={passwordId}>Password</label>
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
                Type {confirmationPhrase} to confirm
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
              <p className={styles.feedbackError} id={errorId} role="alert">
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
                {isDeleting ? "Deleting…" : "Permanently delete my account"}
              </button>
              <button type="button" onClick={closeDialog} disabled={isDeleting}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
