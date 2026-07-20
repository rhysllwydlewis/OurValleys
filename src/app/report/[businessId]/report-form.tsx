"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { submitBusinessReport } from "./actions";

const reasonOptions: { value: string; label: string }[] = [
  {
    value: "incorrect_details",
    label: "Incorrect details (address, phone, hours)",
  },
  { value: "closed_or_moved", label: "This business has closed or moved" },
  {
    value: "inappropriate_content",
    label: "Inappropriate or offensive content",
  },
  { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "other", label: "Something else" },
];

export function ReportForm({ businessId }: { businessId: string }) {
  const [reason, setReason] = useState(reasonOptions[0]!.value);
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<"idle" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await submitBusinessReport({
        businessId,
        reason,
        details: details.trim() ? details.trim() : undefined,
        reporterEmail: email.trim() ? email.trim() : undefined,
      });
      setOutcome(result.status === "submitted" ? "sent" : "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (outcome === "sent") {
    return (
      <div className="state-panel" role="status">
        <p className="eyebrow">Thank you</p>
        <h2>Your report has been sent.</h2>
        <p>
          An OurValleys reviewer will look into this. Reports never publish
          automatically or change the listing on their own.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="report-reason">What&apos;s wrong?</label>
        <select
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="report-details">Details (optional)</label>
        <textarea
          id="report-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={1000}
          placeholder="Tell us what needs correcting."
        />
      </div>
      <div className="field">
        <label htmlFor="report-email">Your email (optional)</label>
        <input
          id="report-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Only if you'd like a reply"
        />
      </div>
      {outcome === "error" ? (
        <p className="field-error" role="alert">
          This could not be sent. Please try again shortly.
        </p>
      ) : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}
