"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UnmetDemandDismissalStatus } from "@/modules/platform/unmet-demand-shared";
import styles from "../admin.module.css";
import { dismissUnmetDemandAction } from "./actions";

const options: {
  status: UnmetDemandDismissalStatus;
  label: string;
  primary: boolean;
}[] = [
  { status: "seeded", label: "Mark seeded", primary: true },
  { status: "out_of_scope", label: "Out of scope", primary: false },
];

export function DemandRowActions({
  queryText,
  categorySlug,
  placeSlug,
}: {
  queryText: string | null;
  categorySlug: string | null;
  placeSlug: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(status: UnmetDemandDismissalStatus) {
    setPending(true);
    setFailed(false);
    try {
      const outcome = await dismissUnmetDemandAction({
        queryText,
        categorySlug,
        placeSlug,
        status,
      });
      if (outcome === "dismissed") router.refresh();
      else setFailed(true);
    } catch {
      setFailed(true);
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
      {failed ? <span role="alert">Could not save. Try again.</span> : null}
    </div>
  );
}
