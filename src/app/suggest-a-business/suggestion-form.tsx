"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useT } from "@/lib/i18n/client";
import { submitBusinessSuggestionAction } from "./actions";

export function SuggestionForm({ initialName = "" }: { initialName?: string }) {
  const t = useT();
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
        <p className="eyebrow">{t("formsCommon.thankYou")}</p>
        <h2>{t("suggest.sentTitle")}</h2>
        <p>{t("suggest.sentBody")}</p>
      </div>
    );
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="suggest-name">{t("suggest.name")}</label>
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
        <label htmlFor="suggest-place">{t("suggest.place")}</label>
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
        <label htmlFor="suggest-category">{t("suggest.category")}</label>
        <input
          id="suggest-category"
          name="categoryText"
          maxLength={80}
          placeholder={t("suggest.categoryPlaceholder")}
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="suggest-note">{t("suggest.note")}</label>
        <textarea id="suggest-note" name="note" maxLength={500} />
      </div>
      <div className="field">
        <label htmlFor="suggest-email">{t("suggest.email")}</label>
        <input
          id="suggest-email"
          name="contactEmail"
          type="email"
          maxLength={254}
          placeholder={t("suggest.emailPlaceholder")}
          autoComplete="email"
        />
      </div>
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", height: 0 }}
      >
        <label htmlFor="suggest-website">{t("suggest.honeypot")}</label>
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
            ? t("suggest.invalid")
            : outcome === "rate_limited"
              ? t("suggest.rateLimited")
              : t("formsCommon.sendFailed")}
        </p>
      ) : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("formsCommon.sending") : t("suggest.submit")}
      </button>
    </form>
  );
}
