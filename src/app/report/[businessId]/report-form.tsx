"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useT } from "@/lib/i18n/client";
import { submitBusinessReport } from "./actions";

const reasonValues = [
  "incorrect_details",
  "closed_or_moved",
  "inappropriate_content",
  "duplicate_listing",
  "other",
] as const;

export function ReportForm({ businessId }: { businessId: string }) {
  const t = useT();
  const [reason, setReason] = useState<string>(reasonValues[0]);
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [suggestedPhone, setSuggestedPhone] = useState("");
  const [suggestedEmail, setSuggestedEmail] = useState("");
  const [suggestedSummary, setSuggestedSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"idle" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await submitBusinessReport({
        businessId,
        reason,
        details: details.trim() || undefined,
        reporterEmail: email.trim() || undefined,
        suggestedPhone: suggestedPhone.trim() || undefined,
        suggestedEmail: suggestedEmail.trim() || undefined,
        suggestedSummary: suggestedSummary.trim() || undefined,
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
        <label htmlFor="report-reason">{t("report.reason")}</label>
        <select
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {reasonValues.map((value) => (
            <option key={value} value={value}>
              {t(`report.reason.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="report-details">{t("report.details")}</label>
        <textarea
          id="report-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={1000}
          placeholder={t("report.detailsPlaceholder")}
        />
      </div>
      {reason === "incorrect_details" ? (
        <fieldset className="form-section">
          <legend>{t("report.suggestedLegend")}</legend>
          <p className="field-help">{t("report.suggestedHelp")}</p>
          <div className="field">
            <label htmlFor="suggested-phone">
              {t("report.suggestedPhone")}
            </label>
            <input
              id="suggested-phone"
              type="tel"
              value={suggestedPhone}
              onChange={(event) => setSuggestedPhone(event.target.value)}
              maxLength={30}
            />
          </div>
          <div className="field">
            <label htmlFor="suggested-email">
              {t("report.suggestedEmail")}
            </label>
            <input
              id="suggested-email"
              type="email"
              value={suggestedEmail}
              onChange={(event) => setSuggestedEmail(event.target.value)}
              maxLength={254}
            />
          </div>
          <div className="field">
            <label htmlFor="suggested-summary">
              {t("report.suggestedSummary")}
            </label>
            <textarea
              id="suggested-summary"
              value={suggestedSummary}
              onChange={(event) => setSuggestedSummary(event.target.value)}
              maxLength={240}
            />
          </div>
        </fieldset>
      ) : null}
      <div className="field">
        <label htmlFor="report-email">{t("report.email")}</label>
        <input
          id="report-email"
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
