"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { ActionOption } from "@/modules/businesses/ticket-desk";
import { resolveTicketAction } from "../actions";
import styles from "../tickets.module.css";
import admin from "../../admin.module.css";

type Outcome = { kind: "ok" | "error"; message: string } | null;

const failureMessages: Record<string, string> = {
  not_found: "This ticket no longer exists.",
  not_eligible: "This ticket has already been decided.",
  unavailable:
    "The decision could not be saved. Nothing was changed; try again.",
  forbidden: "Your admin session cannot make changes. Sign in again.",
  invalid: "That decision could not be applied.",
};

export function ResolvePanel({
  ticketId,
  options,
  terminal,
}: {
  ticketId: string;
  options: ActionOption[];
  terminal: boolean;
}) {
  const router = useRouter();
  const noteId = useId();
  const confirmId = useId();
  // Only a suggested decision is preselected; a risky one is never the default.
  const initial = options.find(
    (option) => option.recommended && !option.blockedReason,
  );
  const [selected, setSelected] = useState<string>(initial?.action ?? "");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();

  const current = options.find((option) => option.action === selected);
  const needsConfirmation =
    current?.tone === "danger" && current.action !== "reject";
  const noteTooShort = note.trim().length < 3;
  const canSubmit =
    Boolean(current) &&
    !current?.blockedReason &&
    !noteTooShort &&
    (!needsConfirmation || confirmed) &&
    !pending;

  if (options.length === 0) {
    return (
      <p className={styles.muted}>
        {terminal
          ? "This ticket is closed and nothing further can be done with it."
          : "No decision is available for this ticket."}
      </p>
    );
  }

  function submit(formData: FormData) {
    setOutcome(null);
    startTransition(async () => {
      try {
        const response = await resolveTicketAction(formData);
        if (response.status === "resolved") {
          setOutcome({
            kind: "ok",
            message: "Decision recorded. The ticket history is updated below.",
          });
          setNote("");
          setConfirmed(false);
          router.refresh();
        } else {
          setOutcome({
            kind: "error",
            message:
              "message" in response && response.message
                ? response.message
                : (failureMessages[response.status] ??
                  "The decision could not be applied."),
          });
        }
      } catch {
        setOutcome({
          kind: "error",
          message: failureMessages.unavailable ?? "Try again.",
        });
      }
    });
  }

  return (
    <form action={submit} noValidate>
      <input type="hidden" name="ticketId" value={ticketId} />
      <fieldset className={styles.options}>
        <legend>
          {terminal ? "Available follow-up" : "Choose a decision"}
        </legend>
        {options.map((option) => {
          const id = `${noteId}-${option.action}`;
          return (
            <label
              key={option.action}
              className={styles.option}
              htmlFor={id}
              data-blocked={Boolean(option.blockedReason)}
            >
              <input
                id={id}
                type="radio"
                name="action"
                value={option.action}
                checked={selected === option.action}
                disabled={Boolean(option.blockedReason)}
                onChange={() => {
                  setSelected(option.action);
                  setConfirmed(false);
                  setOutcome(null);
                }}
                aria-describedby={`${id}-hint`}
              />
              <span className={styles.optionLabel}>
                {option.label}
                {option.recommended ? (
                  <span className={`${admin.pill} ${admin.toneSuccess}`}>
                    Suggested
                  </span>
                ) : null}
              </span>
              <span className={styles.optionSummary} id={`${id}-hint`}>
                {option.blockedReason ?? option.summary}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className={styles.effects} aria-live="polite">
        <h4>What this will do</h4>
        {!current ? (
          <p className={styles.muted}>Choose a decision to see its effects.</p>
        ) : current.effects.length > 0 ? (
          <ul>
            {current.effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>
            {current.blockedReason ?? "No records are changed."}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor={noteId}>Decision note (kept in the audit trail)</label>
        <textarea
          id={noteId}
          name="note"
          required
          minLength={3}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-describedby={`${noteId}-help`}
        />
        <span id={`${noteId}-help`} className={styles.muted}>
          Say why, in a sentence. Shown to other admins, never to the public.
        </span>
      </div>

      {needsConfirmation ? (
        <div className={styles.confirm}>
          <input
            id={confirmId}
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <label htmlFor={confirmId}>
            I have checked the evidence and understand this changes live
            records.
          </label>
        </div>
      ) : null}

      <div role="status" aria-live="polite">
        {outcome ? (
          <p
            className={
              outcome.kind === "ok" ? styles.outcomeOk : styles.outcomeError
            }
          >
            {outcome.message}
          </p>
        ) : null}
      </div>

      <button
        className={`button ${current?.tone === "danger" ? "" : "primary"}`}
        type="submit"
        disabled={!canSubmit}
      >
        {pending ? "Saving…" : (current?.label ?? "Apply decision")}
      </button>
      {noteTooShort && !pending ? (
        <p className={styles.muted}>Add a note to enable the button.</p>
      ) : null}
    </form>
  );
}
