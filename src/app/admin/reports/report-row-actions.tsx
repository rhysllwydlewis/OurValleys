"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import {
  dismissReportAction,
  removeReportedEventAction,
  removeReportedOfferAction,
  removeReportedUpdateAction,
  resolveReportAction,
  restoreReportedEventAction,
  restoreReportedOfferAction,
  restoreReportedUpdateAction,
} from "./actions";

export type ReportedItem = {
  kind: "event" | "offer" | "update";
  title: string;
};

const removeActions = {
  event: removeReportedEventAction,
  offer: removeReportedOfferAction,
  update: removeReportedUpdateAction,
} as const;

const restoreActions = {
  event: restoreReportedEventAction,
  offer: restoreReportedOfferAction,
  update: restoreReportedUpdateAction,
} as const;

const restoredState = {
  event: "paused",
  offer: "paused",
  update: "a draft",
} as const;

export function ReportRowActions({
  reportId,
  item,
}: {
  reportId: string;
  item?: ReportedItem | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(action: () => Promise<{ status: string }>) {
    setPending(true);
    setFailed(false);
    try {
      const result = await action();
      // A refused or lost action says so rather than silently refreshing.
      if (result.status !== "ok") setFailed(true);
      router.refresh();
    } catch {
      setFailed(true);
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
      {item ? (
        <button
          className="button"
          type="button"
          disabled={pending}
          aria-label={`Remove ${item.kind} ${item.title} and resolve its reports`}
          onClick={() => {
            if (
              window.confirm(
                `Remove "${item.title}"? It will leave every public page and its owner cannot edit, republish or delete it. You can restore it later from the resolved reports.`,
              )
            ) {
              void run(() => removeActions[item.kind]({ reportId }));
            }
          }}
        >
          Remove {item.kind}
        </button>
      ) : null}
      {failed ? (
        <span role="alert" className={styles.rowError}>
          That did not go through. Refresh and try again.
        </span>
      ) : null}
    </div>
  );
}

/** Undo a takedown made by mistake; the owner decides when it goes live again. */
export function RestoreButton({
  reportId,
  item,
}: {
  reportId: string;
  item: ReportedItem;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function restore() {
    if (
      !window.confirm(
        `Restore "${item.title}"? It comes back as ${restoredState[item.kind]}, not live; its owner decides when to publish it.`,
      )
    ) {
      return;
    }
    setPending(true);
    setFailed(false);
    try {
      const result = await restoreActions[item.kind]({ reportId });
      if (result.status !== "ok") setFailed(true);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.actionsRow}>
      <button
        className="button"
        type="button"
        disabled={pending}
        aria-label={`Restore ${item.kind} ${item.title}`}
        onClick={() => void restore()}
      >
        Restore {item.kind}
      </button>
      {failed ? (
        <span role="alert" className={styles.rowError}>
          That did not go through. Refresh and try again.
        </span>
      ) : null}
    </div>
  );
}
