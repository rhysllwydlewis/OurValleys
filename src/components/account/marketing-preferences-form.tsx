"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n/client";
import styles from "./account-settings.module.css";

type MarketingPreferencesFormProps = {
  initialMarketingOptIn: boolean;
};

export function MarketingPreferencesForm({
  initialMarketingOptIn,
}: MarketingPreferencesFormProps) {
  const t = useT();
  const [marketingOptIn, setMarketingOptIn] = useState(initialMarketingOptIn);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  async function toggle() {
    const nextValue = !marketingOptIn;
    setIsSaving(true);
    setFeedback(null);

    try {
      const result = await authClient.updateUser({
        marketingOptIn: nextValue,
      });

      if (result.error) {
        setFeedback({
          message: t("prefForm.saveFailed"),
          isError: true,
        });
        return;
      }

      setMarketingOptIn(nextValue);
      setFeedback({
        message: nextValue
          ? t("prefForm.marketing.on")
          : t("prefForm.marketing.off"),
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
          <h3>{t("settings.prefs.marketingTitle")}</h3>
          <p>{t("prefForm.marketing.desc")}</p>
        </div>
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={marketingOptIn}
          aria-label={t("settings.prefs.marketingTitle")}
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
