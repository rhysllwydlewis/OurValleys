"use client";

import { useState } from "react";

/**
 * Copies one feed address. The address is also shown in a read-only field, so
 * a browser without clipboard access still lets the reader copy it by hand.
 */
export function FeedCopyButton({
  address,
  label,
  copiedMessage,
  failedMessage,
  className,
}: {
  address: string;
  label: string;
  copiedMessage: string;
  failedMessage: string;
  className?: string;
}) {
  const [message, setMessage] = useState("");

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setMessage(copiedMessage);
    } catch {
      setMessage(failedMessage);
    }
  }

  return (
    <>
      <button
        className={className ?? "button secondary"}
        type="button"
        onClick={onCopy}
      >
        {label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {message}
      </span>
    </>
  );
}
