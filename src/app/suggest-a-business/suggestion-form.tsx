"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { submitBusinessSuggestionAction } from "./actions";

export function SuggestionForm({ initialName = "" }: { initialName?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<
    "idle" | "sent" | "invalid" | "rate_limited" | "error"
  >("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "");
    setIsSubmitting(true);
    try {
      const result = await submitBusinessSuggestionAction({
        name: value("name"),
        placeText: value("placeText"),
        categoryText: value("categoryText"),
        note: value("note"),
        contactEmail: value("contactEmail"),
        website: value("website"),
      });
      setOutcome(
        result.status === "submitted"
          ? "sent"
          : result.status === "invalid"
            ? "invalid"
            : result.status === "rate_limited"
              ? "rate_limited"
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
        <p className="eyebrow">Thank you</p>
        <h2>Your suggestion has been received.</h2>
        <p>
          An OurValleys reviewer will look at it. Nothing is published
          automatically and the business is not contacted on your behalf.
        </p>
      </div>
    );
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="suggest-name">Business name</label>
        <input
          id="suggest-name"
          name="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={initialName}
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="suggest-place">Town or village</label>
        <input
          id="suggest-place"
          name="placeText"
          required
          minLength={2}
          maxLength={80}
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="suggest-category">
          What kind of business? (optional)
        </label>
        <input
          id="suggest-category"
          name="categoryText"
          maxLength={80}
          placeholder="For example café, plumber or football club"
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="suggest-note">
          Anything we should know? (optional)
        </label>
        <textarea id="suggest-note" name="note" maxLength={500} />
      </div>
      <div className="field">
        <label htmlFor="suggest-email">Your email (optional)</label>
        <input
          id="suggest-email"
          name="contactEmail"
          type="email"
          maxLength={254}
          placeholder="Only if you'd like us to tell you what happens"
          autoComplete="email"
        />
      </div>
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", height: 0 }}
      >
        <label htmlFor="suggest-website">Leave this field empty</label>
        <input
          id="suggest-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      {outcome !== "idle" ? (
        <p className="field-error" role="alert">
          {outcome === "invalid"
            ? "Please check the business name, town and email address."
            : outcome === "rate_limited"
              ? "You have sent several suggestions recently. Please try again later."
              : "This could not be sent. Please try again shortly."}
        </p>
      ) : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send suggestion"}
      </button>
    </form>
  );
}
