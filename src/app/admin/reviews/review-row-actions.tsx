"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { hideReviewAction, restoreReviewAction } from "./actions";

export function ReviewRowActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
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
      {status === "published" ? (
        <button
          className="button"
          type="button"
          disabled={pending}
          onClick={() => run(() => hideReviewAction({ reviewId }))}
        >
          Hide
        </button>
      ) : (
        <button
          className="button primary"
          type="button"
          disabled={pending}
          onClick={() => run(() => restoreReviewAction({ reviewId }))}
        >
          Restore
        </button>
      )}
    </div>
  );
}
