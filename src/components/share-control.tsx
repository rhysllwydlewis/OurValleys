"use client";

import { useState } from "react";

import {
  shareOrCopyLink,
  withWelshLanguage,
  type ShareOutcome,
} from "@/lib/share-link";

const defaultMessages: Record<ShareOutcome, string> = {
  shared: "Thanks for sharing.",
  copied: "Link copied to your clipboard.",
  cancelled: "",
  unavailable:
    "Sharing is not available here. Copy the address from your browser instead.",
};

export function ShareControl({
  title,
  url,
  label = "Share",
  welshLabel,
  messages = defaultMessages,
}: {
  title: string;
  url: string;
  label?: string;
  /** When set, adds a second button sharing the link with `?lang=cy`. */
  welshLabel?: string;
  /** Status messages in the reader's language; English when omitted. */
  messages?: Record<ShareOutcome, string>;
}) {
  const [message, setMessage] = useState("");

  async function onShare(shareUrl: string) {
    const outcome = await shareOrCopyLink(
      {
        share:
          typeof navigator.share === "function"
            ? (data) => navigator.share(data)
            : undefined,
        writeText: navigator.clipboard?.writeText
          ? (text) => navigator.clipboard.writeText(text)
          : undefined,
      },
      { title, url: shareUrl },
    );
    setMessage(messages[outcome]);
  }

  return (
    <div className="share-control" data-print="hide">
      <button
        className="button secondary"
        type="button"
        onClick={() => onShare(url)}
      >
        {label}
      </button>
      {welshLabel ? (
        <button
          className="button secondary"
          type="button"
          onClick={() => onShare(withWelshLanguage(url))}
        >
          {welshLabel}
        </button>
      ) : null}
      <p aria-live="polite" className="share-control-status" role="status">
        {message}
      </p>
    </div>
  );
}
