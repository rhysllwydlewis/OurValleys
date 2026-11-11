"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { resolvePlaceSuggestionAction } from "./actions";

const messages: Record<string, string> = {
  profile_full:
    "That place already has the maximum number of facts. Edit the profile to make room.",
  duplicate_fact:
    "A fact with that heading already exists. Edit the profile instead.",
  already_decided: "Someone has already decided this one.",
  not_found: "That suggestion no longer exists.",
  forbidden: "You need to sign in as an admin.",
  invalid: "That could not be applied.",
  unavailable: "Something went wrong. Please try again.",
};

export function PlaceSuggestionActions({
  suggestionId,
  placeLabel,
  isFact,
}: {
  suggestionId: string;
  placeLabel: string;
  isFact: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(outcome: "applied" | "dismissed", addAsFact: boolean) {
    setPending(true);
    setError(null);
    try {
      const result = await resolvePlaceSuggestionAction({
        suggestionId,
        outcome,
        addAsFact,
      });
      if (result.status === "resolved") router.refresh();
      else {
        setError(messages[result.status] ?? messages.unavailable ?? "");
        if (result.status === "already_decided") router.refresh();
      }
    } catch {
      setError(messages.unavailable ?? "");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className={styles.actionsRow}>
        {isFact ? (
          <button
            className="button primary"
            type="button"
            disabled={pending}
            onClick={() => run("applied", true)}
          >
            Add to Good to know
            <span className="sr-only"> for {placeLabel}</span>
          </button>
        ) : null}
        <button
          className={isFact ? "button" : "button primary"}
          type="button"
          disabled={pending}
          onClick={() => run("applied", false)}
        >
          Mark handled<span className="sr-only"> for {placeLabel}</span>
        </button>
        <button
          className="button"
          type="button"
          disabled={pending}
          onClick={() => run("dismissed", false)}
        >
          Dismiss<span className="sr-only"> for {placeLabel}</span>
        </button>
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
