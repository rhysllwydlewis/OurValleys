"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocale } from "@/lib/i18n/client";
import { submitPublicEnquiry } from "./actions";
import type { PublicEnquiryKind } from "./enquiry-input";

export function EnquiryForm({
  businessId,
  businessName,
  defaultKind,
}: {
  businessId: string;
  businessName: string;
  defaultKind: PublicEnquiryKind;
}) {
  const { locale, t } = useLocale();
  const submittingRef = useRef(false);
  const [messageIsServerText, setMessageIsServerText] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setStatus("submitting");
    setMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      const result = await submitPublicEnquiry({
        businessId,
        kind: String(formData.get("kind")) as PublicEnquiryKind,
        senderName: String(formData.get("senderName") ?? ""),
        senderEmail: String(formData.get("senderEmail") ?? ""),
        senderPhone: String(formData.get("senderPhone") ?? ""),
        message: String(formData.get("message") ?? ""),
        preferredTime: String(formData.get("preferredTime") ?? ""),
        consentAccepted: formData.get("consentAccepted") === "on",
        website: String(formData.get("website") ?? ""),
      });

      if (result.status === "submitted" || result.status === "duplicate") {
        setStatus("sent");
        return;
      }

      setStatus("error");
      setMessageIsServerText(result.status === "invalid");
      setMessage(
        result.status === "rate_limited"
          ? t("enquiry.rateLimited")
          : result.status === "invalid"
            ? result.message
            : t("enquiry.failed"),
      );
    } catch {
      setStatus("error");
      setMessageIsServerText(false);
      setMessage(t("enquiry.failed"));
    } finally {
      submittingRef.current = false;
    }
  }

  if (status === "sent") {
    return (
      <div className="state-panel" role="status">
        <p className="eyebrow">{t("enquiry.sentEyebrow")}</p>
        <h2>{t("enquiry.sentTitle", { business: businessName })}</h2>
        <p>{t("enquiry.sentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-busy={status === "submitting"}>
      <div className="field">
        <label htmlFor="enquiry-kind">{t("enquiry.kind")}</label>
        <select id="enquiry-kind" name="kind" defaultValue={defaultKind}>
          <option value="enquiry">{t("enquiry.kind.enquiry")}</option>
          <option value="quote">{t("enquiry.kind.quote")}</option>
          <option value="callback">{t("enquiry.kind.callback")}</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="enquiry-name">{t("enquiry.name")}</label>
        <input
          id="enquiry-name"
          name="senderName"
          minLength={2}
          maxLength={100}
          required
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="enquiry-email">{t("enquiry.email")}</label>
        <input
          id="enquiry-email"
          name="senderEmail"
          type="email"
          maxLength={254}
          autoComplete="email"
          aria-describedby="enquiry-contact-hint"
        />
      </div>
      <div className="field">
        <label htmlFor="enquiry-phone">{t("enquiry.phone")}</label>
        <input
          id="enquiry-phone"
          name="senderPhone"
          type="tel"
          maxLength={30}
          autoComplete="tel"
          aria-describedby="enquiry-contact-hint"
        />
        <p className="field-hint" id="enquiry-contact-hint">
          {t("enquiry.contactHint")}
        </p>
      </div>
      <div className="field">
        <label htmlFor="enquiry-message">{t("enquiry.message")}</label>
        <textarea
          id="enquiry-message"
          name="message"
          minLength={10}
          maxLength={2000}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="enquiry-time">{t("enquiry.time")}</label>
        <input id="enquiry-time" name="preferredTime" maxLength={120} />
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
        }}
      >
        <label htmlFor="enquiry-website">{t("enquiry.honeypot")}</label>
        <input
          id="enquiry-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <label className="checkbox-field" htmlFor="enquiry-consent">
        <input
          id="enquiry-consent"
          name="consentAccepted"
          type="checkbox"
          required
        />
        <span>{t("enquiry.consent", { business: businessName })}</span>
      </label>
      {status === "error" ? (
        <p
          className="field-error"
          role="alert"
          lang={messageIsServerText && locale === "cy" ? "en-GB" : undefined}
        >
          {message}
        </p>
      ) : null}
      <button
        className="button primary"
        type="submit"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? t("enquiry.sending") : t("enquiry.submit")}
      </button>
    </form>
  );
}
