"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account-settings.module.css";

type SavedPlaceDigestFormProps = {
  initialEnabled: boolean;
};

export function SavedPlaceDigestForm({
  initialEnabled,
}: SavedPlaceDigestFormProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  async function toggle() {
    const nextValue = !enabled;
    setIsSaving(true);
    setFeedback(null);

    try {
      const result = await authClient.updateUser({
        savedPlaceDigestEmails: nextValue,
      });

      if (result.error) {
        setFeedback({
          message: "We could not save this preference. Please try again.",
          isError: true,
        });
        return;
      }

      setEnabled(nextValue);
      setFeedback({
        message: nextValue
          ? "You'll get a weekly email about new businesses and events in your saved places."
          : "You're opted out of the saved-place digest.",
        isError: false,
      });
    } catch {
      setFeedback({
        message: "This preference could not be reached. Please try again.",
        isError: true,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <h3>Email me a weekly digest for my saved places</h3>
          <p>
            Once a week, when there is something new, we&rsquo;ll email new
            businesses and events in the places you have saved. Nothing is sent
            on quiet weeks.
          </p>
        </div>
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={enabled}
          aria-label="Email me a weekly digest for my saved places"
          disabled={isSaving}
          onClick={toggle}
        >
          <span className={styles.switchThumb} aria-hidden="true" />
        </button>
      </div>

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
