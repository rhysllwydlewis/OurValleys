"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../admin.module.css";
import {
  approveAction,
  reinstateAction,
  rejectAction,
  suspendAction,
} from "./actions";

type ModerationPanelProps = {
  businessId: string;
  status: string;
};

export function ModerationPanel({ businessId, status }: ModerationPanelProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  async function run(
    action: () => Promise<{ status: string }>,
    successMessage: string,
  ) {
    setIsPending(true);
    setFeedback(null);
    try {
      const result = await action();
      if (
        result.status === "approved" ||
        result.status === "rejected" ||
        result.status === "suspended" ||
        result.status === "reinstated"
      ) {
        setFeedbackIsError(false);
        setFeedback(successMessage);
        setNote("");
        router.refresh();
      } else if (result.status === "forbidden") {
        setFeedbackIsError(true);
        setFeedback("You do not have permission to do this.");
      } else {
        setFeedbackIsError(true);
        setFeedback(
          "This action is no longer available for this business's current status.",
        );
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={styles.card}>
      <h3>Moderation actions</h3>

      {status === "pending_review" ? (
        <>
          <div className={styles.actionsRow}>
            <button
              className="button primary"
              type="button"
              disabled={isPending}
              onClick={() =>
                run(() => approveAction({ businessId }), "Published.")
              }
            >
              Approve and publish
            </button>
          </div>
          <div className={`${styles.formGrid} ${styles.spaced}`}>
            <label htmlFor="moderation-note">
              Note to the owner (required to reject)
            </label>
            <textarea
              id="moderation-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What needs to change before this can publish?"
            />
          </div>
          <div className={styles.actionsRow}>
            <button
              className={`button ${styles.buttonDanger}`}
              type="button"
              disabled={isPending || note.trim().length < 5}
              onClick={() =>
                run(
                  () => rejectAction({ businessId, note }),
                  "Sent back for changes.",
                )
              }
            >
              Request changes
            </button>
          </div>
        </>
      ) : null}

      {status === "published" ? (
        <>
          <div className={styles.formGrid}>
            <label htmlFor="suspension-reason">Suspension reason</label>
            <textarea
              id="suspension-reason"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why is this business being suspended?"
            />
          </div>
          <div className={styles.actionsRow}>
            <button
              className={`button ${styles.buttonDanger}`}
              type="button"
              disabled={isPending || note.trim().length < 5}
              onClick={() =>
                run(() => suspendAction({ businessId, note }), "Suspended.")
              }
            >
              Suspend business
            </button>
          </div>
        </>
      ) : null}

      {status === "suspended" ? (
        <div className={styles.actionsRow}>
          <button
            className="button primary"
            type="button"
            disabled={isPending}
            onClick={() =>
              run(() => reinstateAction({ businessId }), "Reinstated.")
            }
          >
            Reinstate business
          </button>
        </div>
      ) : null}

      {status === "draft" || status === "rejected" ? (
        <p className="inline-empty">
          Waiting on the business owner to submit this profile for review.
        </p>
      ) : null}

      {feedback ? (
        <p
          className={`${styles.feedback} ${feedbackIsError ? styles.feedbackError : ""}`}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
