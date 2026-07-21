"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getPublicationGuidance } from "@/modules/businesses/publication-guidance";
import { submitForReview } from "./actions";

type PublishPanelProps = {
  businessId: string;
  status: string;
  moderationNote: string | null;
  suspensionReason: string | null;
  canPublish: boolean;
};

export function PublishPanel({
  businessId,
  status,
  moderationNote,
  suspensionReason,
  canPublish,
}: PublishPanelProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"info" | "error">("info");

  const guidance = getPublicationGuidance(status);
  const canSubmit = canPublish && guidance.canSubmit;
  const previewHref = `/dashboard/business/${businessId}/preview` as Route;

  async function handleSubmit() {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await submitForReview({ businessId });
      switch (result.status) {
        case "submitted":
          setFeedbackTone("info");
          setFeedback(
            "Submitted for review. The public site will not change unless a reviewer approves this version.",
          );
          router.refresh();
          break;
        case "incomplete":
          setFeedbackTone("error");
          setFeedback(
            `Finish these steps first: ${result.missingSteps.join(", ")}.`,
          );
          break;
        case "forbidden":
          setFeedbackTone("error");
          setFeedback("Your membership cannot publish this business.");
          break;
        case "not_eligible":
          setFeedbackTone("error");
          setFeedback(
            "This profile cannot be resubmitted from its current state.",
          );
          router.refresh();
          break;
        case "not_found":
          setFeedbackTone("error");
          setFeedback("This business could not be found.");
          break;
        case "unavailable":
          setFeedbackTone("error");
          setFeedback(
            "Submission is temporarily unavailable. Your saved draft has not been published or changed.",
          );
          break;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="detail-panel">
      <div className="tag-row">
        <span className={`status-chip status-chip--${guidance.chip}`}>
          {guidance.label}
        </span>
      </div>
      <p className="eyebrow">Publish readiness</p>
      <h3>{guidance.description}</h3>
      <dl className="compact-facts">
        <div>
          <dt>Who can see it now</dt>
          <dd>{guidance.visibility}</dd>
        </div>
        <div>
          <dt>What happens next</dt>
          <dd>{guidance.nextAction}</dd>
        </div>
        <div>
          <dt>Rollback and safety</dt>
          <dd>{guidance.rollback}</dd>
        </div>
      </dl>
      {status === "rejected" ? (
        <div className="inline-empty" role="note">
          <strong>Reviewer feedback</strong>
          <p>
            {moderationNote ??
              "No reviewer note is available. Contact the platform team before resubmitting."}
          </p>
        </div>
      ) : null}
      {status === "suspended" ? (
        <div className="inline-empty" role="note">
          <strong>Suspension reason</strong>
          <p>
            {suspensionReason ??
              "No suspension reason is available. Contact the platform team for support."}
          </p>
        </div>
      ) : null}
      <div className="button-row">
        <Link className="button secondary" href={previewHref}>
          Preview latest saved draft
        </Link>
        {canSubmit ? (
          <button
            className="button primary"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting…" : "Submit for review"}
          </button>
        ) : null}
      </div>
      {!canPublish ? (
        <p className="inline-empty" role="note">
          Your membership can view publication status but cannot submit or
          resubmit this business.
        </p>
      ) : null}
      {feedback ? (
        <p
          role={feedbackTone === "error" ? "alert" : "status"}
          className="inline-empty"
        >
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
