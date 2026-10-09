"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
import styles from "./account-settings.module.css";

type SavedEventNotificationsFormProps = {
  initialEnabled: boolean;
};

export function SavedEventNotificationsForm({
  initialEnabled,
}: SavedEventNotificationsFormProps) {
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
        savedEventCancellationEmails: nextValue,
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
        message: nextValue ? t("prefForm.cancel.on") : t("prefForm.cancel.off"),
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
          <h3>{t("settings.prefs.cancelTitle")}</h3>
          <p>{t("prefForm.cancel.desc")}</p>
        </div>
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={enabled}
          aria-label={t("settings.prefs.cancelTitle")}
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
