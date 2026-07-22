import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicDemoAccountByEmail } from "@/lib/demo-account";
import {
  isPlatformAdmin,
  readRawSession,
} from "@/modules/identity/admin-access";
import styles from "./admin.module.css";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function PublicAdminDemoOverview() {
  return (
    <>
      <section className={styles.card} role="note">
        <p className={styles.eyebrow}>Sanitised development view</p>
        <h2>Read-only public admin demonstration</h2>
        <p>
          This shared account demonstrates the administration shell without
          exposing user records, reports, private business details or audit
          data. Administrative mutations and account settings are disabled.
        </p>
      </section>
      <section className={styles.section} aria-labelledby="demo-admin-scope">
        <h2 id="demo-admin-scope">What the private admin area will manage</h2>
        <div className={styles.statRow}>
          <div className={styles.statTile}>
            <strong>Businesses</strong>
            <span>Review publication and lifecycle states</span>
          </div>
          <div className={styles.statTile}>
            <strong>Trust</strong>
            <span>Handle reports, claims and corrections</span>
          </div>
          <div className={styles.statTile}>
            <strong>Reference data</strong>
            <span>Maintain categories and places</span>
          </div>
          <div className={styles.statTile}>
            <strong>Audit</strong>
            <span>Keep accountable administrative records</span>
          </div>
        </div>
      </section>
    </>
  );
}

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

  const publicDemo = getPublicDemoAccountByEmail(session.user.email);
  const isPublicAdminDemo = publicDemo?.key === "admin";

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
        <AdminNav readOnlyDemo={isPublicAdminDemo} />
        {isPublicAdminDemo ? <PublicAdminDemoOverview /> : children}
      </main>
      <SiteFooter />
    </>
  );
}
