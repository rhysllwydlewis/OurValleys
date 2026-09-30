"use client";

import { useState } from "react";

import { shareOrCopyLink, type ShareOutcome } from "@/lib/share-link";

const messages: Record<ShareOutcome, string> = {
  shared: "Thanks for sharing.",
  copied: "Link copied to your clipboard.",
  cancelled: "",
  unavailable:
    "Sharing is not available here. Copy the address from your browser instead.",
};

export function ShareControl({
  title,
  path,
  label = "Share",
}: {
  title: string;
  path: string;
  label?: string;
}) {
  const [message, setMessage] = useState("");

  async function onShare() {
    const url = new URL(path, window.location.origin).toString();
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
    <div className="share-control">
      <button className="button secondary" type="button" onClick={onShare}>
        {label}
      </button>
      <p aria-live="polite" className="share-control-status" role="status">
        {message}
      </p>
    </div>
  );
}
