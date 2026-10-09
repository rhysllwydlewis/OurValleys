"use client";

import { useState } from "react";

import { shareOrCopyLink, type ShareOutcome } from "@/lib/share-link";

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
  messages = defaultMessages,
}: {
  title: string;
  url: string;
  label?: string;
  /** Status messages in the reader's language; English when omitted. */
  messages?: Record<ShareOutcome, string>;
}) {
  const [message, setMessage] = useState("");

  async function onShare() {
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
      { title, url },
    );
    setMessage(messages[outcome]);
  }

  return (
    <div className="share-control" data-print="hide">
      <button className="button secondary" type="button" onClick={onShare}>
        {label}
      </button>
      <p aria-live="polite" className="share-control-status" role="status">
        {message}
      </p>
    </div>
  );
}
