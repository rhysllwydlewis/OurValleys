"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
import styles from "./account-settings.module.css";

type SavedEventReminderFormProps = {
  initialEnabled: boolean;
};

export function SavedEventReminderForm({
  initialEnabled,
}: SavedEventReminderFormProps) {
  const t = useT();
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
          message: t("prefForm.saveFailed"),
          isError: true,
        });
        return;
      }

      setEnabled(nextValue);
      setFeedback({
        message: nextValue
          ? t("prefForm.reminder.on")
          : t("prefForm.reminder.off"),
        isError: false,
      });
    } catch {
      setFeedback({
        message: t("prefForm.unreachable"),
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
          <h3>{t("prefForm.reminder.title")}</h3>
          <p>{t("prefForm.reminder.desc")}</p>
        </div>
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={enabled}
          aria-label={t("prefForm.reminder.title")}
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
