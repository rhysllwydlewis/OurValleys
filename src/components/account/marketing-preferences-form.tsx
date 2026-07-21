"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./account-settings.module.css";

type MarketingPreferencesFormProps = {
  initialMarketingOptIn: boolean;
};

export function MarketingPreferencesForm({
  initialMarketingOptIn,
}: MarketingPreferencesFormProps) {
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
          message: "We could not save this preference. Please try again.",
          isError: true,
        });
        return;
      }

      setMarketingOptIn(nextValue);
      setFeedback({
        message: nextValue
          ? "You're opted in to marketing updates."
          : "You're opted out of marketing updates.",
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
          <h3>Email me about new features and local updates</h3>
          <p>
            We don&rsquo;t send marketing emails yet, but saving your preference
            now means you won&rsquo;t need to revisit this once we do.
          </p>
        </div>
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={marketingOptIn}
          aria-label="Email me about new features and local updates"
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
