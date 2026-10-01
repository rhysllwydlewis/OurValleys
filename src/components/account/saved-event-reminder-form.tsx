"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account-settings.module.css";

type SavedEventReminderFormProps = {
  initialEnabled: boolean;
};

export function SavedEventReminderForm({
  initialEnabled,
}: SavedEventReminderFormProps) {
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
        savedEventReminderEmails: nextValue,
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
          ? "You'll get a reminder email the day before a saved event."
          : "You're opted out of saved-event reminders.",
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
          <h3>Email me a reminder before events I have saved</h3>
          <p>
            We&rsquo;ll send one email the day before an event you saved takes
            place, with the date and a link to it. Cancelled events are never
            reminded.
          </p>
        </div>
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={enabled}
          aria-label="Email me a reminder before events I have saved"
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
