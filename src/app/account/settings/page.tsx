import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountPanel } from "@/components/account/delete-account-panel";
import { MarketingPreferencesForm } from "@/components/account/marketing-preferences-form";
import { SavedEventNotificationsForm } from "@/components/account/saved-event-notifications-form";
import { ProfileSettingsForm } from "@/components/account/profile-settings-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { getPublicDemoAccountByEmail } from "@/lib/demo-account";
import { getAvatarTone, getInitials } from "@/lib/initials";
import styles from "./settings.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account settings",
};

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M19 12H5m0 0 5.5-5.5M5 12l5.5 5.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4 12.5 5.5 5.5L20 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

  const publicDemo = getPublicDemoAccountByEmail(session.user.email);

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <Link className={styles.backLink} href="/account">
          <ArrowLeftIcon />
          Account overview
        </Link>

        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>Your account</p>
          <h1>Account settings</h1>
          <p>
            Manage your profile, communication preferences and account access in
            one place.
          </p>
        </header>

        {publicDemo ? (
          <section
            className={styles.demoNotice}
            role="note"
            aria-labelledby="demo-settings-title"
          >
            <span className={styles.demoNoticeIcon} aria-hidden="true">
              <LockIcon />
            </span>
            <div>
              <p className={styles.demoLabel}>{publicDemo.label} demo</p>
              <h2 id="demo-settings-title">
                Public demo settings are read-only.
              </h2>
              <p>
                The complete settings experience is shown below, but changes are
                disabled so this shared fictional account remains safe for the
                next visitor.
              </p>
            </div>
          </section>
        ) : null}

        <div className={styles.settingsLayout}>
          <nav
            className={styles.sectionNav}
            aria-label="Account settings sections"
          >
            <a href="#profile">Profile</a>
            <a href="#preferences">Preferences</a>
            <a href="#access">Account access</a>
            <a href="#danger">Delete account</a>
          </nav>

          <div className={styles.settingsContent}>
            <section
              className={styles.settingsSection}
              id="profile"
              aria-labelledby="profile-heading"
            >
              <div className={styles.sectionIntro}>
                <p className={styles.eyebrow}>Profile</p>
                <h2 id="profile-heading">Name and photo</h2>
                <p>Choose how your identity appears across OurValleys.</p>
              </div>

              {publicDemo ? (
                <div className={styles.previewCard}>
                  <div className={styles.profileSummary}>
                    <span
                      className={`${styles.avatar} ${styles[`tone${getAvatarTone(session.user.id)}`]}`}
                      aria-hidden="true"
                    >
                      {getInitials(session.user.name)}
                    </span>
                    <div>
                      <strong>{session.user.name}</strong>
                      <span>{session.user.email}</span>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor="demo-profile-name">Name</label>
                      <input
                        id="demo-profile-name"
                        type="text"
                        value={session.user.name}
                        disabled
                        readOnly
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="demo-profile-image">
                        Profile photo link
                      </label>
                      <input
                        id="demo-profile-image"
                        type="url"
                        value={session.user.image ?? ""}
                        placeholder="No profile photo added"
                        disabled
                        readOnly
                      />
                      <p>
                        Profile details cannot be changed on a shared demo
                        account.
                      </p>
                    </div>
                  </div>

                  <button
                    className={styles.disabledPrimary}
                    type="button"
                    disabled
                  >
                    Save profile
                  </button>
                </div>
              ) : (
                <ProfileSettingsForm
                  initialName={session.user.name}
                  initialImage={session.user.image ?? ""}
                />
              )}
            </section>

            <section
              className={styles.settingsSection}
              id="preferences"
              aria-labelledby="preferences-heading"
            >
              <div className={styles.sectionIntro}>
                <p className={styles.eyebrow}>Preferences</p>
                <h2 id="preferences-heading">Email updates</h2>
                <p>Control optional product and local-update emails.</p>
              </div>

              {publicDemo ? (
                <div className={styles.previewCard}>
                  <div className={styles.toggleRow}>
                    <div>
                      <h3>Email me about new features and local updates</h3>
                      <p>
                        This preference is visible for demonstration but cannot
                        be changed in this shared account.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.switch}
                      role="switch"
                      aria-checked={Boolean(session.user.marketingOptIn)}
                      aria-label="Email me about new features and local updates"
                      disabled
                    >
                      <span aria-hidden="true" />
                    </button>
                  </div>
                  <div className={styles.toggleRow}>
                    <div>
                      <h3>Email me if a saved event is cancelled</h3>
                      <p>
                        This preference is visible for demonstration but cannot
                        be changed in this shared account.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.switch}
                      role="switch"
                      aria-checked={Boolean(
                        session.user.savedEventCancellationEmails,
                      )}
                      aria-label="Email me if a saved event is cancelled"
                      disabled
                    >
                      <span aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <MarketingPreferencesForm
                    initialMarketingOptIn={Boolean(session.user.marketingOptIn)}
                  />
                  <SavedEventNotificationsForm
                    initialEnabled={Boolean(
                      session.user.savedEventCancellationEmails,
                    )}
                  />
                </>
              )}
            </section>

            <section
              className={styles.settingsSection}
              id="access"
              aria-labelledby="access-heading"
            >
              <div className={styles.sectionIntro}>
                <p className={styles.eyebrow}>Account access</p>
                <h2 id="access-heading">Email and verification</h2>
                <p>Review the identity currently attached to this account.</p>
              </div>

              <div className={styles.accessCard}>
                <div className={styles.accessRow}>
                  <div>
                    <span>Email address</span>
                    <strong>{session.user.email}</strong>
                  </div>
                  {session.user.emailVerified ? (
                    <span className={styles.statusBadge}>
                      <CheckIcon /> Verified
                    </span>
                  ) : (
                    <span>Not verified</span>
                  )}
                </div>
                <p>
                  Your email is kept private and is used for secure account
                  access and essential service messages.
                </p>
              </div>
            </section>

            <section
              className={`${styles.settingsSection} ${styles.dangerSection}`}
              id="danger"
              aria-labelledby="danger-heading"
            >
              <div className={styles.sectionIntro}>
                <p className={styles.dangerEyebrow}>Danger zone</p>
                <h2 id="danger-heading">Delete account</h2>
                <p>Permanently remove your profile and account access.</p>
              </div>

              {publicDemo ? (
                <div className={styles.demoDangerCard}>
                  <div>
                    <h3>Account deletion is unavailable</h3>
                    <p>
                      Shared demonstration accounts cannot be changed or
                      deleted. Sign out when you have finished exploring.
                    </p>
                  </div>
                  <span className={styles.lockedBadge}>
                    <LockIcon /> Locked
                  </span>
                </div>
              ) : (
                <DeleteAccountPanel />
              )}
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
