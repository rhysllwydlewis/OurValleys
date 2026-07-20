"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { dismissReportAction, resolveReportAction } from "./actions";

export function ReportRowActions({ reportId }: { reportId: string }) {
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
    </div>
  );
}
