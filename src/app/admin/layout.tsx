import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  isPlatformAdmin,
  readRawSession,
} from "@/modules/identity/admin-access";
import styles from "./admin.module.css";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await readRawSession();
  if (!session) redirect("/login?next=/admin");

  if (!isPlatformAdmin(session.user)) {
    return (
      <>
        <SiteHeader />
        <main className={styles.shell}>
          <div className={styles.notAuthorized}>
            <p className={styles.eyebrow}>Restricted area</p>
            <h1>This area is for platform admins only.</h1>
            <p>
              Your account is signed in but does not have platform-admin access.
              If you believe this is a mistake, contact an existing admin.
            </p>
            <Link className="button primary" href="/account">
              Back to your account
            </Link>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Platform administration</p>
            <h1>Admin</h1>
          </div>
        </div>
        <AdminNav />
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
