import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getUserDetailForAdmin } from "@/modules/identity/admin-users";
import { readAdminSession } from "@/modules/identity/admin-access";
import styles from "../../admin.module.css";
import { statusTone } from "../../status-tone";
import { UserControls } from "./user-controls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User details",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const parsed = z.uuid().safeParse(userId);
  if (!parsed.success) notFound();

  const [result, admin] = await Promise.all([
    getUserDetailForAdmin(parsed.data),
    readAdminSession(),
  ]);
  if (result.state === "missing") notFound();

  if (result.state === "unavailable") {
    return (
      <div className={styles.emptyState}>
        This account is temporarily unavailable. Please try again shortly.
      </div>
    );
  }

  const { user } = result;

  return (
    <section>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{user.email}</p>
          <h2>{user.name}</h2>
        </div>
        <span className={`${styles.pill} ${styles[statusTone(user.role)]}`}>
          {user.role}
        </span>
      </div>

      <div className={styles.card}>
        <dl className="compact-facts">
          <div>
            <dt>Email verified</dt>
            <dd>{user.emailVerified ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
          {user.banned ? (
            <div>
              <dt>Ban reason</dt>
              <dd>{user.banReason ?? "No reason given"}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className={styles.spaced}>
        <UserControls
          userId={user.id}
          role={user.role}
          banned={user.banned}
          isSelf={admin?.userId === user.id}
          memberships={user.memberships}
        />
      </div>
    </section>
  );
}
