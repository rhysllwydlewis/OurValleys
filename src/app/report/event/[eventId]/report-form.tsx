"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useT } from "@/lib/i18n/client";
import { submitEventReportAction } from "./actions";

const reasonValues = [
  "incorrect_details",
  "cancelled_or_wrong_date",
  "inappropriate_content",
  "duplicate_listing",
  "other",
] as const;

export function ReportForm({ eventId }: { eventId: string }) {
  const t = useT();
  const [reason, setReason] = useState<string>(reasonValues[0]);
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"idle" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await submitEventReportAction({
        eventId,
        reason,
        details: details.trim() || undefined,
        reporterEmail: email.trim() || undefined,
      });
      setOutcome(result.status === "submitted" ? "sent" : "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (outcome === "sent") {
    return (
      <div className="state-panel" role="status">
        <p className="eyebrow">{t("formsCommon.thankYou")}</p>
        <h2>{t("report.sentTitle")}</h2>
        <p>{t("report.sentBody")}</p>
      </div>
    );
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="event-report-reason">{t("report.reason")}</label>
        <select
          id="event-report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {reasonValues.map((value) => (
            <option key={value} value={value}>
              {t(`report.eventReason.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="event-report-details">{t("report.details")}</label>
        <textarea
          id="event-report-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={1000}
          placeholder={t("report.detailsPlaceholder")}
        />
      </div>
      <div className="field">
        <label htmlFor="event-report-email">{t("report.email")}</label>
        <input
          id="event-report-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("report.emailPlaceholder")}
        />
      </div>
      {outcome === "error" ? (
        <p className="field-error" role="alert">
          {t("formsCommon.sendFailed")}
        </p>
      ) : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("formsCommon.sending") : t("report.submit")}
      </button>
    </form>
  );
}
