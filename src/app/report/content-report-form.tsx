"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";

type Outcome = { status: "submitted" | "not_found" | "unavailable" };

/**
 * The report form for an offer or a business update. The reasons and the
 * server action differ; everything the visitor sees and does is the same, so
 * the two routes share this one form.
 */
export function ContentReportForm({
  reasons,
  reasonKeyPrefix,
  submit,
}: {
  reasons: readonly string[];
  /** Message-key prefix for the option labels, e.g. `report.offerReason`. */
  reasonKeyPrefix: string;
  submit: (input: {
    reason: string;
    details?: string;
    reporterEmail?: string;
  }) => Promise<Outcome>;
}) {
  const t = useT();
  const id = useId();
  const [reason, setReason] = useState<string>(reasons[0] ?? "other");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"idle" | "sent" | "gone" | "error">(
    "idle",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await submit({
        reason,
        details: details.trim() || undefined,
        reporterEmail: email.trim() || undefined,
      });
      setOutcome(
        result.status === "submitted"
          ? "sent"
          : result.status === "not_found"
            ? "gone"
            : "error",
      );
    } catch {
      setOutcome("error");
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
  if (outcome === "gone") {
    return (
      <div className="state-panel" role="status">
        <h2>{t("report.goneTitle")}</h2>
        <p>{t("report.goneBody")}</p>
      </div>
    );
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor={`${id}-reason`}>{t("report.reason")}</label>
        <select
          id={`${id}-reason`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {reasons.map((value) => (
            <option key={value} value={value}>
              {t(`${reasonKeyPrefix}.${value}` as MessageKey)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`${id}-details`}>{t("report.contentDetails")}</label>
        <textarea
          id={`${id}-details`}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={1000}
          placeholder={t("report.contentDetailsPlaceholder")}
        />
      </div>
      <div className="field">
        <label htmlFor={`${id}-email`}>{t("report.email")}</label>
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
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
