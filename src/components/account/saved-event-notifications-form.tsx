"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account-settings.module.css";

type SavedEventNotificationsFormProps = {
  initialEnabled: boolean;
};

export function SavedEventNotificationsForm({
  initialEnabled,
}: SavedEventNotificationsFormProps) {
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
        savedEventCancellationEmails: nextValue,
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
          ? "You'll be emailed when a saved event is cancelled."
          : "You're opted out of saved event cancellation emails.",
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
          <h3>Email me if a saved event is cancelled</h3>
          <p>
            When a business cancels an event you have saved, we&rsquo;ll let you
            know by email so you can make other plans.
          </p>
        </div>
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={enabled}
          aria-label="Email me if a saved event is cancelled"
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
