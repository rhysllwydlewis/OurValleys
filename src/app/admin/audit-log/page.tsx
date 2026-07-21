import type { Metadata } from "next";
import { listRecentAdminAudit } from "@/modules/identity/audit-log";
import styles from "../admin.module.css";
import { statusLabel } from "../status-tone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit log",
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminAuditLogPage() {
  const result = await listRecentAdminAudit(150);

  return (
    <section>
      <h2>Audit log</h2>
      <p className={styles.hint}>
        Every moderation action taken through this admin area, most recent
        first.
      </p>

      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          The audit log is temporarily unavailable. Please try again shortly.
        </div>
      ) : result.entries.length === 0 ? (
        <div className={styles.emptyState}>No admin actions recorded yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {result.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>{entry.actor ? entry.actor.email : "System"}</td>
                  <td>{statusLabel(entry.action.replace(/\./g, "_"))}</td>
                  <td>
                    {entry.targetType}
                    {entry.targetId ? ` · ${entry.targetId}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
