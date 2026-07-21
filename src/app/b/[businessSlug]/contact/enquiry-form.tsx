"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { submitPublicEnquiry } from "./actions";

export function EnquiryForm({
  businessId,
  businessName,
  defaultKind,
}: {
  businessId: string;
  businessName: string;
  defaultKind: "enquiry" | "quote" | "callback";
}) {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const result = await submitPublicEnquiry({
      businessId,
      kind: String(formData.get("kind")) as "enquiry" | "quote" | "callback",
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
    setMessage(
      result.status === "rate_limited"
        ? "Too many messages were submitted from this connection. Please wait before trying again."
        : result.status === "invalid"
          ? result.message
          : "The message could not be sent just now. Nothing was lost from the business website.",
    );
  }

  if (status === "sent") {
    return (
      <div className="state-panel" role="status">
        <p className="eyebrow">Message sent</p>
        <h2>{businessName} has received your message.</h2>
        <p>The business can reply using the contact details you supplied.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-busy={status === "submitting"}>
      <div className="field">
        <label htmlFor="enquiry-kind">What do you need?</label>
        <select id="enquiry-kind" name="kind" defaultValue={defaultKind}>
          <option value="enquiry">General enquiry</option>
          <option value="quote">Request a quote</option>
          <option value="callback">Request a callback</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="enquiry-name">Your name</label>
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
        <label htmlFor="enquiry-email">Email address</label>
        <input
          id="enquiry-email"
          name="senderEmail"
          type="email"
          maxLength={254}
          autoComplete="email"
        />
      </div>
      <div className="field">
        <label htmlFor="enquiry-phone">Telephone number</label>
        <input
          id="enquiry-phone"
          name="senderPhone"
          type="tel"
          maxLength={30}
          autoComplete="tel"
        />
        <p className="field-hint">
          Add an email address or telephone number so the business can reply.
        </p>
      </div>
      <div className="field">
        <label htmlFor="enquiry-message">Message</label>
        <textarea
          id="enquiry-message"
          name="message"
          minLength={10}
          maxLength={2000}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="enquiry-time">Preferred callback time (optional)</label>
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
        <label htmlFor="enquiry-website">Website</label>
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
        <span>
          I agree that OurValleys may send this message and my supplied contact
          details to {businessName}. The information is not published publicly.
        </span>
      </label>
      {status === "error" ? (
        <p className="field-error" role="alert">
          {message}
        </p>
      ) : null}
      <button
        className="button primary"
        type="submit"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
