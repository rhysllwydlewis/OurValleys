import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readAdminSession } from "@/modules/identity/admin-access";
import { listStoriesForAdmin } from "@/modules/stories/admin";
import styles from "../admin.module.css";
import { StoryManager } from "./story-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Local news" };

export default async function AdminStoriesPage() {
  if (!(await readAdminSession())) notFound();
  const result = await listStoriesForAdmin();
  return (
    <section>
      <h2>Local news</h2>
      <p className={styles.hint}>
        Short stories written by the team. A story stays off the public site
        until it is published; moving it back to draft or archiving it removes
        it again. Published stories appear on the News page and get their own
        page that search engines can index.
      </p>
      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Stories are temporarily unavailable. Please try again shortly.
        </div>
      ) : (
        <StoryManager stories={result.stories} />
      )}
    </section>
  );
}
