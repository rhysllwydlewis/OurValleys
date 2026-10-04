"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import {
  dismissReportAction,
  removeReportedEventAction,
  resolveReportAction,
} from "./actions";

export function ReportRowActions({
  reportId,
  eventTitle,
}: {
  reportId: string;
  eventTitle?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ status: string }>) {
    setPending(true);
    try {
      await action();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.actionsRow}>
      <button
        className="button primary"
        type="button"
        disabled={pending}
        onClick={() => run(() => resolveReportAction({ reportId }))}
      >
        Resolve
      </button>
      <button
        className="button"
        type="button"
        disabled={pending}
        onClick={() => run(() => dismissReportAction({ reportId }))}
      >
        Dismiss
      </button>
      {eventTitle ? (
        <button
          className="button"
          type="button"
          disabled={pending}
          aria-label={`Remove event ${eventTitle} and resolve its reports`}
          onClick={() => {
            if (
              window.confirm(
                `Remove "${eventTitle}"? It will leave every public page and its organiser cannot reinstate it.`,
              )
            ) {
              void run(() => removeReportedEventAction({ reportId }));
            }
          }}
        >
          Remove event
        </button>
      ) : null}
    </div>
  );
}
