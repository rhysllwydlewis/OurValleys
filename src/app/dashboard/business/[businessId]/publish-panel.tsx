"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitForReview } from "./actions";

type PublishPanelProps = {
  businessId: string;
  status: string;
  moderationNote: string | null;
  suspensionReason: string | null;
  canPublish: boolean;
};

const statusCopy: Record<
  string,
  { label: string; chip: "complete" | "todo" | "planned"; description: string }
> = {
  draft: {
    label: "Not submitted",
    chip: "todo",
    description:
      "Complete profile, location, services and hours, then submit this profile for review.",
  },
  pending_review: {
    label: "In review",
    chip: "planned",
    description:
      "An OurValleys reviewer is checking this profile. This usually takes a short time.",
  },
  published: {
    label: "Published",
    chip: "complete",
    description: "This profile is live in local business discovery.",
  },
  rejected: {
    label: "Changes requested",
    chip: "todo",
    description:
      "A reviewer asked for changes before this can publish. See the note below, update the profile, then resubmit.",
  },
  suspended: {
    label: "Suspended",
    chip: "todo",
    description:
      "This profile has been suspended and is not visible in discovery. See the reason below.",
  },
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

  const copy = statusCopy[status] ?? statusCopy.draft!;
  const canSubmit = canPublish && (status === "draft" || status === "rejected");
  const previewHref = `/dashboard/business/${businessId}/preview`;

  async function handleSubmit() {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await submitForReview({ businessId });
      switch (result.status) {
        case "submitted":
          setFeedbackTone("info");
          setFeedback(
            "Submitted for review. A reviewer will check it shortly.",
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
            "Submission is temporarily unavailable. Please try again.",
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
        <span className={`status-chip status-chip--${copy.chip}`}>
          {copy.label}
        </span>
      </div>
      <p className="eyebrow">Publish readiness</p>
      <h3>{copy.description}</h3>
      <p>
        Preview the generated website at any point. The preview is private,
        reflects the latest saved draft and never publishes changes
        automatically.
      </p>
      {status === "rejected" && moderationNote ? (
        <p className="inline-empty" role="note">
          Reviewer note: {moderationNote}
        </p>
      ) : null}
      {status === "suspended" && suspensionReason ? (
        <p className="inline-empty" role="note">
          Suspension reason: {suspensionReason}
        </p>
      ) : null}
      <div className="button-row">
        <Link className="button secondary" href={previewHref}>
          Preview generated website
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
