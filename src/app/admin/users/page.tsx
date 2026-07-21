import type { Metadata, Route } from "next";
import Link from "next/link";
import { listUsersForAdmin } from "@/modules/identity/admin-users";
import styles from "../admin.module.css";
import { statusTone } from "../status-tone";
import { UserSearchForm } from "./user-search-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const result = await listUsersForAdmin(q);

  return (
    <section>
      <h2>Users</h2>
      <UserSearchForm initialQuery={q ?? ""} />

      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          User data is temporarily unavailable. Please try again shortly.
        </div>
      ) : result.users.length === 0 ? (
        <div className={styles.emptyState}>No users match this search.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {result.users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <Link
                      className={styles.rowLink}
                      href={`/admin/users/${user.id}` as Route}
                    >
                      {user.name}
                    </Link>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className={`${styles.pill} ${styles[statusTone(user.role)]}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.banned ? (
                      <span className={`${styles.pill} ${styles.toneDanger}`}>
                        Banned
                      </span>
                    ) : (
                      <span className={`${styles.pill} ${styles.toneSuccess}`}>
                        Active
                      </span>
                    )}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
