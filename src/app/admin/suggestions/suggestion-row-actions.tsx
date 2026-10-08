"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { reviewSuggestionAction } from "./actions";

const options = [
  { status: "seeded", label: "Mark seeded", primary: true },
  { status: "already_listed", label: "Already listed", primary: false },
  { status: "rejected", label: "Reject", primary: false },
] as const;

export function SuggestionRowActions({
  suggestionId,
}: {
  suggestionId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(status: (typeof options)[number]["status"]) {
    setPending(true);
    try {
      await reviewSuggestionAction({ suggestionId, status });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.actionsRow}>
      {options.map((option) => (
        <button
          key={option.status}
          className={option.primary ? "button primary" : "button"}
          type="button"
          disabled={pending}
          onClick={() => run(option.status)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
