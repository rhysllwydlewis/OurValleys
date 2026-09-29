"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../../admin.module.css";
import {
  recordVerificationCheckAction,
  revokeVerificationCheckAction,
} from "./actions";

export type VerificationPanelCheck = {
  id: string;
  label: string;
  state: "active" | "expired" | "revoked";
  evidenceNote: string;
  checkedOn: string;
  checkedBy: string | null;
  expiresOn: string | null;
  revokedReason: string | null;
};

type VerificationPanelProps = {
  businessId: string;
  summary: string;
  types: { value: string; label: string }[];
  checks: VerificationPanelCheck[];
};

export function VerificationPanel({
  businessId,
  summary,
  types,
  checks,
}: VerificationPanelProps) {
  const router = useRouter();
  const [checkType, setCheckType] = useState(types[0]?.value ?? "");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  function report(ok: boolean, message: string) {
    setFeedbackIsError(!ok);
    setFeedback(message);
  }

  async function record() {
    setIsPending(true);
    setFeedback(null);
    try {
      const result = await recordVerificationCheckAction({
        businessId,
        checkType,
        evidenceNote,
        expiresOn: expiresOn || null,
      });
      if (result.status === "recorded") {
        report(true, "Check recorded.");
        setEvidenceNote("");
        setExpiresOn("");
        router.refresh();
      } else if (result.status === "forbidden") {
        report(false, "You do not have permission to do this.");
      } else if (result.status === "invalid") {
        report(
          false,
          "Add a short evidence note; any expiry date must be in the future.",
        );
      } else {
        report(false, "The check could not be recorded. Please try again.");
      }
    } finally {
      setIsPending(false);
    }
  }

  async function revoke(checkId: string) {
    setIsPending(true);
    setFeedback(null);
    try {
      const result = await revokeVerificationCheckAction({
        checkId,
        reason: revokeReason,
      });
      if (result.status === "revoked") {
        report(true, "Check revoked.");
        setRevokeReason("");
        router.refresh();
      } else if (result.status === "forbidden") {
        report(false, "You do not have permission to do this.");
      } else {
        report(false, "Give a reason of at least five characters.");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={styles.card}>
      <h3>Verification checks</h3>
      <p className="inline-empty">
        Public badge: <strong>{summary}</strong>. A business counts as verified
        only while at least one specific check below is active and unexpired.
        Evidence notes are private and never shown publicly. Payment and plan
        never affect this.
      </p>

      {checks.length > 0 ? (
        <ul>
          {checks.map((check) => (
            <li key={check.id}>
              <strong>{check.label}</strong> — {check.state}
              <br />
              <span>
                Checked {check.checkedOn}
                {check.checkedBy ? ` by ${check.checkedBy}` : ""}
                {check.expiresOn ? `, expires ${check.expiresOn}` : ""}.
              </span>
              <br />
              <span>Evidence: {check.evidenceNote}</span>
              {check.revokedReason ? (
                <>
                  <br />
                  <span>Revoked: {check.revokedReason}</span>
                </>
              ) : null}
              {check.state === "active" ? (
                <div className={styles.actionsRow}>
                  <button
                    className={`button ${styles.buttonDanger}`}
                    type="button"
                    disabled={isPending || revokeReason.trim().length < 5}
                    onClick={() => revoke(check.id)}
                  >
                    Revoke {check.label.toLowerCase()}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="inline-empty">No checks recorded yet.</p>
      )}

      {checks.some((check) => check.state === "active") ? (
        <div className={styles.formGrid}>
          <label htmlFor="verification-revoke-reason">
            Reason for revoking (required to revoke a check)
          </label>
          <input
            id="verification-revoke-reason"
            value={revokeReason}
            onChange={(event) => setRevokeReason(event.target.value)}
          />
        </div>
      ) : null}

      <div className={`${styles.formGrid} ${styles.spaced}`}>
        <label htmlFor="verification-type">Check type</label>
        <select
          id="verification-type"
          value={checkType}
          onChange={(event) => setCheckType(event.target.value)}
        >
          {types.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <label htmlFor="verification-evidence">
          Evidence note (private; what exactly was checked)
        </label>
        <textarea
          id="verification-evidence"
          value={evidenceNote}
          onChange={(event) => setEvidenceNote(event.target.value)}
        />
        <label htmlFor="verification-expiry">Expires on (optional)</label>
        <input
          id="verification-expiry"
          type="date"
          value={expiresOn}
          onChange={(event) => setExpiresOn(event.target.value)}
        />
      </div>
      <div className={styles.actionsRow}>
        <button
          className="button primary"
          type="button"
          disabled={isPending || evidenceNote.trim().length < 5}
          onClick={record}
        >
          Record check
        </button>
      </div>

      {feedback ? (
        <p
          role={feedbackIsError ? "alert" : "status"}
          className={`${styles.feedback} ${feedbackIsError ? styles.feedbackError : ""}`}
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
