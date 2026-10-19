"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminGuide } from "@/modules/guides/admin";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";
import {
  archiveGuideAction,
  publishGuideAction,
  revertGuideToDraftAction,
} from "./actions";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

type RowAction = (input: unknown) => Promise<string>;

function GuideRowActions({
  guide,
  onResult,
}: {
  guide: AdminGuide;
  onResult: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(action: RowAction, success: string) {
    setPending(true);
    try {
      const result = await action({ id: guide.id });
      if (result === "updated") {
        onResult(`“${guide.title}” ${success}.`);
        router.refresh();
      } else if (result === "not_ready") {
        onResult(
          `“${guide.title}” is not ready to publish. Open it to see which checks are missing.`,
        );
      } else if (result === "forbidden") {
        onResult("You do not have permission to do that.");
      } else {
        onResult(`Could not update “${guide.title}”. Try again.`);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.actionsRow}>
      <Link
        className="button"
        href={`/admin/guides/${guide.id}`}
        aria-label={`Edit “${guide.title}”`}
      >
        Edit
      </Link>
      {guide.status !== "published" ? (
        <button
          className="button primary"
          type="button"
          disabled={pending}
          aria-label={`Publish “${guide.title}”`}
          onClick={() => run(publishGuideAction, "is now published")}
        >
          Publish
        </button>
      ) : (
        <button
          className="button"
          type="button"
          disabled={pending}
          aria-label={`Move “${guide.title}” to draft`}
          onClick={() => run(revertGuideToDraftAction, "was moved to draft")}
        >
          Move to draft
        </button>
      )}
      {guide.status !== "archived" ? (
        <button
          className={`button ${styles.buttonDanger}`}
          type="button"
          disabled={pending}
          aria-label={`Archive “${guide.title}”`}
          onClick={() => run(archiveGuideAction, "was archived")}
        >
          Archive
        </button>
      ) : (
        <button
          className="button"
          type="button"
          disabled={pending}
          aria-label={`Restore “${guide.title}” to draft`}
          onClick={() => run(revertGuideToDraftAction, "was restored to draft")}
        >
          Restore to draft
        </button>
      )}
    </div>
  );
}

export function GuideManager({
  guides,
  overdueGuideIds,
}: {
  guides: AdminGuide[];
  overdueGuideIds: Set<string>;
}) {
  const [message, setMessage] = useState("");
  const counts = {
    published: guides.filter((item) => item.status === "published").length,
    draft: guides.filter((item) => item.status === "draft").length,
    archived: guides.filter((item) => item.status === "archived").length,
  };

  return (
    <>
      <div className={styles.statRow} role="list" aria-label="Guides by status">
        <div className={styles.statTile} role="listitem">
          <strong>{counts.published}</strong>
          <span>Published</span>
        </div>
        <div className={styles.statTile} role="listitem">
          <strong>{counts.draft}</strong>
          <span>Drafts</span>
        </div>
        <div className={styles.statTile} role="listitem">
          <strong>{counts.archived}</strong>
          <span>Archived</span>
        </div>
      </div>

      <div className={styles.actionsRow}>
        <Link className="button primary" href="/admin/guides/new">
          Write a new guide
        </Link>
      </div>

      <p className={styles.feedback} role="status" hidden={!message}>
        {message}
      </p>

      {guides.length === 0 ? (
        <div className={styles.emptyState}>
          No guides yet. Write the first one: a guide connects businesses,
          places and events into one journey.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Area</th>
                <th scope="col">Status</th>
                <th scope="col">Review by</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {guides.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link
                      className={styles.rowLink}
                      href={`/admin/guides/${item.id}`}
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td>{item.areaLabel}</td>
                  <td>
                    <span
                      className={`${styles.pill} ${styles[statusTone(item.status)]}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                    {overdueGuideIds.has(item.id) ? (
                      <span
                        className={`${styles.pill} ${styles.pillInline} ${styles.toneWarning}`}
                      >
                        Review overdue
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {item.reviewDueAt
                      ? formatDate(item.reviewDueAt)
                      : "Not set"}
                  </td>
                  <td>{formatDate(item.updatedAt)}</td>
                  <td>
                    <GuideRowActions guide={item} onResult={setMessage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
