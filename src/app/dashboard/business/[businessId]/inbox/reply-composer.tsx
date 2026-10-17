"use client";

import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { replyToEnquiryFromInboxAction } from "./actions";
import styles from "./inbox.module.css";

type Template = { id: string; label: string; text: string };

const MAX_LENGTH = 2000;

function SendButton({ send, sending }: { send: string; sending: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="button primary"
      type="submit"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? sending : send}
    </button>
  );
}

/**
 * Reply box with ready-made starting points. A template only fills the box;
 * nothing is sent until the owner presses the send button, and the owner can
 * edit every word first.
 */
export function ReplyComposer({
  businessId,
  enquiryId,
  hidden,
  templates,
  labels,
}: {
  businessId: string;
  enquiryId: string;
  /** The list state to return to, as plain fields. */
  hidden: Record<string, string>;
  templates: Template[];
  labels: {
    templates: string;
    reply: string;
    note: string;
    remaining: string;
    send: string;
    sending: string;
  };
}) {
  const [body, setBody] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const noteId = useId();
  const left = MAX_LENGTH - body.length;

  return (
    <form className={styles.composer} action={replyToEnquiryFromInboxAction}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="enquiryId" value={enquiryId} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div
        className={styles.templates}
        role="group"
        aria-label={labels.templates}
      >
        <span className={styles.templatesLabel} aria-hidden="true">
          {labels.templates}
        </span>
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className={styles.templateButton}
            onClick={() => {
              // Never throw away what the owner has already typed.
              setBody((current) =>
                current.trim()
                  ? `${current.trimEnd()}\n\n${template.text}`
                  : template.text,
              );
              area.current?.focus();
            }}
          >
            {template.label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`reply-${enquiryId}`}>
        {labels.reply}
      </label>
      <textarea
        ref={area}
        id={`reply-${enquiryId}`}
        name="body"
        rows={8}
        maxLength={MAX_LENGTH}
        required
        value={body}
        onChange={(event) => setBody(event.target.value)}
        aria-describedby={noteId}
        placeholder={labels.reply}
      />
      <div className={styles.composerFoot}>
        <p id={noteId} className={styles.muted}>
          {labels.note}{" "}
          <span aria-live="off">
            {labels.remaining.replace("{count}", String(left))}
          </span>
        </p>
        <SendButton send={labels.send} sending={labels.sending} />
      </div>
    </form>
  );
}
