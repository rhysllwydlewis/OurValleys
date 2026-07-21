import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountPanel } from "@/components/account/delete-account-panel";
import { MarketingPreferencesForm } from "@/components/account/marketing-preferences-form";
import { ProfileSettingsForm } from "@/components/account/profile-settings-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import styles from "../account.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account settings",
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function AccountSettingsPage() {
  const session = await readSession();
  if (!session) redirect("/login?next=/account/settings");

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <div>
          <p className={styles.eyebrow}>Account settings</p>
          <h1>Manage your account.</h1>
          <p className={styles.lead}>
            Update your profile, choose whether we can contact you about
            updates, or permanently delete your account.
          </p>
          <p className={styles.lead}>
            <Link href="/account">Back to your account overview</Link>
          </p>
        </div>

        <section className={styles.section} aria-labelledby="profile-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Profile</p>
              <h2 id="profile-heading">Name and photo</h2>
            </div>
          </div>
          <ProfileSettingsForm
            initialName={session.user.name}
            initialImage={session.user.image ?? ""}
          />
        </section>

        <section className={styles.section} aria-labelledby="marketing-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Preferences</p>
              <h2 id="marketing-heading">Marketing preferences</h2>
            </div>
          </div>
          <MarketingPreferencesForm
            initialMarketingOptIn={Boolean(session.user.marketingOptIn)}
          />
        </section>

        <section className={styles.section} aria-labelledby="danger-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Danger zone</p>
              <h2 id="danger-heading">Delete account</h2>
            </div>
          </div>
          <DeleteAccountPanel />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
