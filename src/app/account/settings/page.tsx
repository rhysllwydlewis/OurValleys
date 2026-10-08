import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountPanel } from "@/components/account/delete-account-panel";
import { MarketingPreferencesForm } from "@/components/account/marketing-preferences-form";
import { SavedEventNotificationsForm } from "@/components/account/saved-event-notifications-form";
import { SavedEventReminderForm } from "@/components/account/saved-event-reminder-form";
import { SavedPlaceDigestForm } from "@/components/account/saved-place-digest-form";
import { TwoFactorPanel } from "@/components/account/two-factor-panel";
import { ProfileSettingsForm } from "@/components/account/profile-settings-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { getPublicDemoAccountByEmail } from "@/lib/demo-account";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getAvatarTone, getInitials } from "@/lib/initials";
import styles from "./settings.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("settings.metaTitle") };
}

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
  const { locale, t } = await getTranslator();
  const session = await readSession();
  if (!session) redirect("/login?next=/account/settings");

  const publicDemo = getPublicDemoAccountByEmail(session.user.email);

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
        <Link className={styles.backLink} href="/account">
          <ArrowLeftIcon />
          {t("settings.back")}
        </Link>

        <header className={styles.pageHeader}>
          <p className={styles.eyebrow}>{t("settings.eyebrow")}</p>
          <h1>{t("settings.title")}</h1>
          <p>{t("settings.lead")}</p>
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
              <p className={styles.demoLabel}>
                {t("settings.demo.label", { label: publicDemo.label })}
              </p>
              <h2 id="demo-settings-title">{t("settings.demo.title")}</h2>
              <p>{t("settings.demo.body")}</p>
            </div>
          </section>
        ) : null}

        <div className={styles.settingsLayout}>
          <nav
            className={styles.sectionNav}
            aria-label={t("settings.nav.label")}
          >
            <a href="#profile">{t("settings.nav.profile")}</a>
            <a href="#preferences">{t("settings.nav.preferences")}</a>
            <a href="#access">{t("settings.nav.access")}</a>
            {publicDemo ? null : (
              <a href="#two-step">{t("settings.nav.twoStep")}</a>
            )}
            <a href="#data">{t("settings.nav.data")}</a>
            <a href="#danger">{t("settings.nav.danger")}</a>
          </nav>

          <div className={styles.settingsContent}>
            <section
              className={styles.settingsSection}
              id="profile"
              aria-labelledby="profile-heading"
            >
              <div className={styles.sectionIntro}>
                <p className={styles.eyebrow}>
                  {t("settings.profile.eyebrow")}
                </p>
                <h2 id="profile-heading">{t("settings.profile.title")}</h2>
                <p>{t("settings.profile.lead")}</p>
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
                      <strong lang={authoredTextLang}>
                        {session.user.name}
                      </strong>
                      <span>{session.user.email}</span>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor="demo-profile-name">
                        {t("settings.profile.name")}
                      </label>
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
                        {t("settings.profile.imageLabel")}
                      </label>
                      <input
                        id="demo-profile-image"
                        type="url"
                        value={session.user.image ?? ""}
                        placeholder={t("settings.profile.imagePlaceholder")}
                        disabled
                        readOnly
                      />
                      <p>{t("settings.profile.demoNote")}</p>
                    </div>
                  </div>

                  <button
                    className={styles.disabledPrimary}
                    type="button"
                    disabled
                  >
                    {t("settings.profile.save")}
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
                <p className={styles.eyebrow}>{t("settings.prefs.eyebrow")}</p>
                <h2 id="preferences-heading">{t("settings.prefs.title")}</h2>
                <p>{t("settings.prefs.lead")}</p>
              </div>

              {publicDemo ? (
                <div className={styles.previewCard}>
                  <div className={styles.toggleRow}>
                    <div>
                      <h3>{t("settings.prefs.marketingTitle")}</h3>
                      <p>{t("settings.prefs.demoNote")}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.switch}
                      role="switch"
                      aria-checked={Boolean(session.user.marketingOptIn)}
                      aria-label={t("settings.prefs.marketingTitle")}
                      disabled
                    >
                      <span aria-hidden="true" />
                    </button>
                  </div>
                  <div className={styles.toggleRow}>
                    <div>
                      <h3>{t("settings.prefs.cancelTitle")}</h3>
                      <p>{t("settings.prefs.demoNote")}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.switch}
                      role="switch"
                      aria-checked={Boolean(
                        session.user.savedEventCancellationEmails,
                      )}
                      aria-label={t("settings.prefs.cancelTitle")}
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
                  <SavedEventReminderForm
                    initialEnabled={Boolean(
                      session.user.savedEventReminderEmails,
                    )}
                  />
                  <SavedPlaceDigestForm
                    initialEnabled={Boolean(
                      session.user.savedPlaceDigestEmails,
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
                <p className={styles.eyebrow}>{t("settings.access.eyebrow")}</p>
                <h2 id="access-heading">{t("settings.access.title")}</h2>
                <p>{t("settings.access.lead")}</p>
              </div>

              <div className={styles.accessCard}>
                <div className={styles.accessRow}>
                  <div>
                    <span>{t("settings.access.email")}</span>
                    <strong>{session.user.email}</strong>
                  </div>
                  {session.user.emailVerified ? (
                    <span className={styles.statusBadge}>
                      <CheckIcon /> {t("settings.access.verified")}
                    </span>
                  ) : (
                    <span>{t("settings.access.unverified")}</span>
                  )}
                </div>
                <p>{t("settings.access.privacy")}</p>
              </div>
            </section>

            {publicDemo ? null : (
              <section
                className={styles.settingsSection}
                id="two-step"
                aria-labelledby="two-step-heading"
              >
                <div className={styles.sectionIntro}>
                  <p className={styles.eyebrow}>
                    {t("settings.security.eyebrow")}
                  </p>
                  <h2 id="two-step-heading">{t("settings.security.title")}</h2>
                  <p>{t("settings.security.lead")}</p>
                </div>
                <TwoFactorPanel
                  initialEnabled={session.user.twoFactorEnabled === true}
                  required={session.user.role === "admin"}
                />
              </section>
            )}

            <section
              className={styles.settingsSection}
              id="data"
              aria-labelledby="data-heading"
            >
              <div className={styles.sectionIntro}>
                <p className={styles.eyebrow}>{t("settings.data.eyebrow")}</p>
                <h2 id="data-heading">{t("settings.data.title")}</h2>
                <p>{t("settings.data.lead")}</p>
              </div>

              {publicDemo ? (
                <div className={styles.demoDangerCard}>
                  <div>
                    <h3>{t("settings.data.demoTitle")}</h3>
                    <p>{t("settings.data.demoBody")}</p>
                  </div>
                  <span className={styles.lockedBadge}>
                    <LockIcon /> {t("settings.locked")}
                  </span>
                </div>
              ) : (
                <div className={styles.accessCard}>
                  <div className={styles.accessRow}>
                    <div>
                      <span>{t("settings.data.what")}</span>
                      <strong>{t("settings.data.everything")}</strong>
                    </div>
                    <a className="button" href="/api/account/export" download>
                      {t("settings.data.download")}
                    </a>
                  </div>
                  <p>{t("settings.data.includes")}</p>
                </div>
              )}
            </section>

            <section
              className={`${styles.settingsSection} ${styles.dangerSection}`}
              id="danger"
              aria-labelledby="danger-heading"
            >
              <div className={styles.sectionIntro}>
                <p className={styles.dangerEyebrow}>
                  {t("settings.danger.eyebrow")}
                </p>
                <h2 id="danger-heading">{t("settings.danger.title")}</h2>
                <p>{t("settings.danger.lead")}</p>
              </div>

              {publicDemo ? (
                <div className={styles.demoDangerCard}>
                  <div>
                    <h3>{t("settings.danger.demoTitle")}</h3>
                    <p>{t("settings.danger.demoBody")}</p>
                  </div>
                  <span className={styles.lockedBadge}>
                    <LockIcon /> {t("settings.locked")}
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
