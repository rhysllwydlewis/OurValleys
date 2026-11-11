"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useT } from "@/lib/i18n/client";
import { submitPlaceSuggestionAction } from "./actions";

type Kind = "fact" | "correction" | "welsh" | "other";
const kinds: Kind[] = ["fact", "correction", "welsh", "other"];
const FACT_MAX = 240;
const MESSAGE_MAX = 500;

export function PlaceSuggestForm({ placeSlug }: { placeSlug: string }) {
  const t = useT();
  const [kind, setKind] = useState<Kind>("fact");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<
    "idle" | "sent" | "invalid" | "rate_limited" | "not_found" | "error"
  >("idle");
  const max = kind === "fact" ? FACT_MAX : MESSAGE_MAX;
  const errorRef = useRef<HTMLParagraphElement>(null);
  const sentRef = useRef<HTMLDivElement>(null);

  // Move focus to what changed so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (outcome === "sent") sentRef.current?.focus();
    else if (outcome !== "idle") errorRef.current?.focus();
  }, [outcome]);

  function chooseKind(next: Kind) {
    setKind(next);
    // A fact is shorter than other suggestions: trim rather than fail later.
    if (next === "fact") setMessage((current) => current.slice(0, FACT_MAX));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      const result = await submitPlaceSuggestionAction({
        placeSlug,
        kind,
        factLabel: String(form.get("factLabel") ?? ""),
        message,
        website: String(form.get("website") ?? ""),
      });
      setOutcome(
        result.status === "submitted"
          ? "sent"
          : result.status === "invalid"
            ? "invalid"
            : result.status === "rate_limited"
              ? "rate_limited"
              : result.status === "not_found"
                ? "not_found"
                : "error",
      );
      if (result.status === "submitted") setMessage("");
    } catch {
      setOutcome("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (outcome === "sent") {
    return (
      <div className="state-panel" role="status" tabIndex={-1} ref={sentRef}>
        <p className="eyebrow">{t("formsCommon.thankYou")}</p>
        <h2>{t("placeSuggest.sentTitle")}</h2>
        <p>{t("placeSuggest.sentBody")}</p>
        <button
          className="button"
          type="button"
          onClick={() => setOutcome("idle")}
        >
          {t("placeSuggest.sentAnother")}
        </button>
      </div>
    );
  }

  const error =
    outcome === "invalid"
      ? t("placeSuggest.invalid")
      : outcome === "rate_limited"
        ? t("placeSuggest.rateLimited")
        : outcome === "not_found"
          ? t("placeSuggest.notFound")
          : outcome === "error"
            ? t("placeSuggest.error")
            : null;

  return (
    <form className="report-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="field">
        <legend>{t("placeSuggest.kindLegend")}</legend>
        {kinds.map((value) => (
          <label key={value} className="choice-row">
            <input
              type="radio"
              name="kind"
              value={value}
              checked={kind === value}
              onChange={() => chooseKind(value)}
            />{" "}
            {t(`placeSuggest.kind.${value}` as const)}
          </label>
        ))}
      </fieldset>
      {kind === "fact" ? (
        <div className="field">
          <label htmlFor="place-suggest-label">
            {t("placeSuggest.factLabel")}
          </label>
          <input
            id="place-suggest-label"
            name="factLabel"
            required
            maxLength={60}
            autoComplete="off"
            aria-describedby="place-suggest-label-hint"
          />
          <p className="field-hint" id="place-suggest-label-hint">
            {t("placeSuggest.factLabelHint")}
          </p>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="place-suggest-message">
          {kind === "fact"
            ? t("placeSuggest.factValue")
            : t("placeSuggest.message")}
        </label>
        <textarea
          id="place-suggest-message"
          name="message"
          required
          minLength={3}
          maxLength={max}
          rows={kind === "fact" ? 3 : 6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-describedby="place-suggest-message-hint place-suggest-count"
        />
        <p className="field-hint" id="place-suggest-message-hint">
          {kind === "fact"
            ? t("placeSuggest.factValueHint")
            : t("placeSuggest.messageHint")}
        </p>
        <p className="field-hint" id="place-suggest-count">
          {t("placeSuggest.counter", { count: message.length, max })}
        </p>
      </div>
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", height: 0 }}
      >
        <label htmlFor="place-suggest-website">
          {t("placeSuggest.honeypot")}
        </label>
        <input
          id="place-suggest-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      {error ? (
        <p className="field-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </p>
      ) : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("formsCommon.sending") : t("placeSuggest.submit")}
      </button>
    </form>
  );
}
