"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isWelshComplete } from "@/modules/stories/model";
import type { AdminStory } from "@/modules/stories/admin";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";
import {
  archiveStoryAction,
  deleteStoryAction,
  publishStoryAction,
  revertStoryToDraftAction,
} from "./actions";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

type RowAction = (input: unknown) => Promise<string>;

function StoryRowActions({
  story,
  onResult,
}: {
  story: AdminStory;
  onResult: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(action: RowAction, success: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setPending(true);
    try {
      const result = await action({ id: story.id });
      if (result === "updated" || result === "deleted") {
        onResult(`“${story.title}” ${success}.`);
        router.refresh();
      } else if (result === "not_ready") {
        onResult(
          `“${story.title}” is not ready to publish. Open it to see which checks are missing.`,
        );
      } else if (result === "conflict") {
        onResult(
          `“${story.title}” changed while it was being checked. Open it, read the new text, then publish.`,
        );
      } else if (result === "forbidden") {
        onResult("You do not have permission to do that.");
      } else {
        onResult(`Could not update “${story.title}”. Try again.`);
      }
    } finally {
      setPending(false);
    }
  }

  const live = story.status === "published";
  const takeDown = `This takes “${story.title}” off the public site straight away. Continue?`;
  return (
    <div className={styles.actionsRow}>
      <Link
        className="button"
        href={`/admin/stories/${story.id}`}
        aria-label={`Edit: “${story.title}”`}
      >
        Edit
      </Link>
      {live ? (
        <button
          className="button"
          type="button"
          disabled={pending}
          aria-label={`Move to draft: “${story.title}”`}
          onClick={() =>
            run(revertStoryToDraftAction, "was moved to draft", takeDown)
          }
        >
          Move to draft
        </button>
      ) : (
        <button
          className="button primary"
          type="button"
          disabled={pending}
          aria-label={`${story.status === "scheduled" ? "Publish now" : "Publish"}: “${story.title}”`}
          onClick={() => run(publishStoryAction, "is now published")}
        >
          {story.status === "scheduled" ? "Publish now" : "Publish"}
        </button>
      )}
      {story.status === "scheduled" ? (
        <button
          className="button"
          type="button"
          disabled={pending}
          aria-label={`Cancel schedule: “${story.title}”`}
          onClick={() => run(revertStoryToDraftAction, "was returned to draft")}
        >
          Cancel schedule
        </button>
      ) : null}
      {story.status === "archived" ? (
        <button
          className="button"
          type="button"
          disabled={pending}
          aria-label={`Restore to draft: “${story.title}”`}
          onClick={() => run(revertStoryToDraftAction, "was restored to draft")}
        >
          Restore to draft
        </button>
      ) : (
        <button
          className={`button ${styles.buttonDanger}`}
          type="button"
          disabled={pending}
          aria-label={`Archive: “${story.title}”`}
          onClick={() =>
            run(archiveStoryAction, "was archived", live ? takeDown : undefined)
          }
        >
          Archive
        </button>
      )}
      {story.status === "draft" ? (
        <button
          className={`button ${styles.buttonDanger}`}
          type="button"
          disabled={pending}
          aria-label={`Delete draft: “${story.title}”`}
          onClick={() =>
            run(
              deleteStoryAction,
              "was deleted",
              `Delete the draft “${story.title}” for good? This cannot be undone.`,
            )
          }
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}

export function StoryManager({ stories }: { stories: AdminStory[] }) {
  const [message, setMessage] = useState("");
  const count = (status: string) =>
    stories.filter((item) => item.status === status).length;

  return (
    <>
      <div
        className={styles.statRow}
        role="list"
        aria-label="Stories by status"
      >
        <div className={styles.statTile} role="listitem">
          <strong>{count("published")}</strong>
          <span>Published</span>
        </div>
        <div className={styles.statTile} role="listitem">
          <strong>{count("scheduled")}</strong>
          <span>Scheduled</span>
        </div>
        <div className={styles.statTile} role="listitem">
          <strong>{count("draft")}</strong>
          <span>Drafts</span>
        </div>
        <div className={styles.statTile} role="listitem">
          <strong>{count("archived")}</strong>
          <span>Archived</span>
        </div>
      </div>

      <div className={styles.actionsRow}>
        <Link className="button primary" href="/admin/stories/new">
          Write a story
        </Link>
      </div>

      <div role="status" className={message ? styles.feedback : undefined}>
        {message}
      </div>

      {stories.length === 0 ? (
        <div className={styles.emptyState}>
          No stories yet. Write the first one: a short, factual update for
          people in the valleys.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Headline</th>
                <th scope="col">Status</th>
                <th scope="col">Welsh</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {stories.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link
                      className={styles.rowLink}
                      href={`/admin/stories/${item.id}`}
                    >
                      {item.title}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`${styles.pill} ${styles[statusTone(item.status)]}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                    {item.status === "scheduled" && item.scheduledFor ? (
                      <>
                        <br />
                        <span className={styles.hint}>
                          Goes live {formatDateTime(item.scheduledFor)}
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td>{isWelshComplete(item) ? "Complete" : "Not complete"}</td>
                  <td>{formatDate(item.updatedAt)}</td>
                  <td>
                    <StoryRowActions story={item} onResult={setMessage} />
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
