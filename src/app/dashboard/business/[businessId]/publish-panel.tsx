"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/client";
import {
  authoredTextLang,
  onboardingStepTitle,
  publicationGuidanceCopy,
} from "@/lib/i18n/business-copy";
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
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"info" | "error">("info");

  const guidance = publicationGuidanceCopy(
    t,
    status,
    getPublicationGuidance(status),
  );
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
          setFeedback(t("dash.publish.submitted"));
          router.refresh();
          break;
        case "incomplete":
          setFeedbackTone("error");
          setFeedback(
            t("dash.publish.incomplete", {
              steps: result.missingSteps
                .map((step) => onboardingStepTitle(t, step))
                .join(", "),
            }),
          );
          break;
        case "forbidden":
          setFeedbackTone("error");
          setFeedback(t("dash.publish.forbidden"));
          break;
        case "not_eligible":
          setFeedbackTone("error");
          setFeedback(t("dash.publish.notEligible"));
          router.refresh();
          break;
        case "not_found":
          setFeedbackTone("error");
          setFeedback(t("dash.publish.notFound"));
          break;
        case "unavailable":
          setFeedbackTone("error");
          setFeedback(t("dash.publish.unavailable"));
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
      <p className="eyebrow">{t("dash.publish.eyebrow")}</p>
      <h3>{guidance.description}</h3>
      <dl className="compact-facts">
        <div>
          <dt>{t("dash.publish.whoCanSee")}</dt>
          <dd>{guidance.visibility}</dd>
        </div>
        <div>
          <dt>{t("dash.publish.whatNext")}</dt>
          <dd>{guidance.nextAction}</dd>
        </div>
        <div>
          <dt>{t("dash.publish.rollback")}</dt>
          <dd>{guidance.rollback}</dd>
        </div>
      </dl>
      {status === "rejected" ? (
        <div className="inline-empty" role="note">
          <strong>{t("dash.publish.reviewerFeedback")}</strong>
          <p lang={moderationNote ? authoredTextLang : undefined}>
            {moderationNote ?? t("dash.publish.noReviewerNote")}
          </p>
        </div>
      ) : null}
      {status === "suspended" ? (
        <div className="inline-empty" role="note">
          <strong>{t("dash.publish.suspensionReason")}</strong>
          <p lang={suspensionReason ? authoredTextLang : undefined}>
            {suspensionReason ?? t("dash.publish.noSuspensionReason")}
          </p>
        </div>
      ) : null}
      <div className="button-row">
        <Link className="button secondary" href={previewHref}>
          {t("dash.publish.preview")}
        </Link>
        {canSubmit ? (
          <button
            className="button primary"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t("dash.publish.submitting")
              : t("dash.publish.submit")}
          </button>
        ) : null}
      </div>
      {!canPublish ? (
        <p className="inline-empty" role="note">
          {t("dash.publish.noPermission")}
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
