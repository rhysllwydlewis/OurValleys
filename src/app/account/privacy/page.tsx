import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import {
  NOTICE_PREFERENCE_OPTIONS,
  parsePreferenceOutcome,
} from "@/modules/residents/notice-preferences-model";
import { listMutedKinds } from "@/modules/residents/notice-preferences";
import {
  readPrivacySummary,
  type PrivacyHoldings,
} from "@/modules/residents/privacy-summary";
import { saveNoticePreferencesAction } from "./actions";
import styles from "./privacy.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("privacy.metaTitle") };
}

const HOLDING_LABELS: ReadonlyArray<[keyof PrivacyHoldings, MessageKey]> = [
  ["savedBusinesses", "privacy.holding.savedBusinesses"],
  ["mutedBusinesses", "privacy.holding.mutedBusinesses"],
  ["savedPlaces", "privacy.holding.savedPlaces"],
  ["savedEvents", "privacy.holding.savedEvents"],
  ["savedSearches", "privacy.holding.savedSearches"],
  ["notifications", "privacy.holding.notifications"],
  ["reviews", "privacy.holding.reviews"],
  ["reportsFiled", "privacy.holding.reportsFiled"],
  ["businessRoles", "privacy.holding.businessRoles"],
];

const OUTCOME_LABEL = {
  saved: "privacy.outcome.saved",
  invalid: "privacy.outcome.failed",
  forbidden: "privacy.outcome.failed",
  unavailable: "privacy.outcome.failed",
} as const;

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string | string[] }>;
}) {
  const { locale, t } = await getTranslator();
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    redirect(`/login?next=${encodeURIComponent("/account/privacy")}`);
  }
  const outcome = parsePreferenceOutcome((await searchParams).outcome);
  const isDemo = isPublicDemoEmail(session.user.email);
  const [summary, muted] = isDemo
    ? [null, null]
    : await Promise.all([
        readPrivacySummary(session.user.id),
        listMutedKinds(session.user.id),
      ]);
  const lang = LOCALE_DETAILS[locale].htmlLang;

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={lang}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t("privacy.eyebrow")}</p>
            <h1>{t("privacy.title")}</h1>
            <p className={styles.lead}>{t("privacy.lead")}</p>
          </div>
          <div className={styles.actions}>
            <Link className="button" href={"/account" as Route}>
              {t("privacy.back")}
            </Link>
          </div>
        </header>

        {outcome ? (
          <p
            className={`${styles.outcome} ${outcome === "saved" ? "" : styles.outcomeProblem}`}
            role={outcome === "saved" ? "status" : "alert"}
          >
            {t(OUTCOME_LABEL[outcome])}
          </p>
        ) : null}

        {isDemo ? (
          <p className={styles.stateCard}>{t("privacy.demo")}</p>
        ) : (
          <>
            <section
              className={styles.section}
              id="holdings"
              aria-labelledby="holdings-heading"
            >
              <h2 id="holdings-heading">{t("privacy.holdings.title")}</h2>
              <p>{t("privacy.holdings.lead")}</p>
              {summary?.state === "ready" ? (
                <ul className={styles.holdings}>
                  {HOLDING_LABELS.map(([key, label]) => (
                    <li key={key}>
                      <strong>{summary.holdings[key]}</strong>
                      <span>{t(label)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p role="alert">{t("privacy.holdings.unavailable")}</p>
              )}
              <p>{t("privacy.holdings.account")}</p>
            </section>

            <section
              className={styles.section}
              id="notices"
              aria-labelledby="notices-heading"
            >
              <h2 id="notices-heading">{t("privacy.notices.title")}</h2>
              <p>{t("privacy.notices.lead")}</p>
              <form action={saveNoticePreferencesAction}>
                <fieldset className={styles.switches}>
                  <legend className="sr-only">
                    {t("privacy.notices.legend")}
                  </legend>
                  {NOTICE_PREFERENCE_OPTIONS.map((option) => (
                    <label className={styles.switch} key={option.kind}>
                      <input
                        type="checkbox"
                        name="kind"
                        value={option.kind}
                        defaultChecked={!muted?.has(option.kind)}
                      />
                      <div>
                        <strong>{t(option.label)}</strong>
                        <span>{t(option.hint)}</span>
                      </div>
                    </label>
                  ))}
                </fieldset>
                <div className={styles.formActions}>
                  <button className="button" type="submit">
                    {t("privacy.notices.save")}
                  </button>
                  <Link
                    href={"/account/notifications" as Route}
                    className="button"
                  >
                    {t("privacy.notices.inbox")}
                  </Link>
                </div>
              </form>
            </section>

            <section
              className={styles.section}
              id="email"
              aria-labelledby="email-heading"
            >
              <h2 id="email-heading">{t("privacy.email.title")}</h2>
              <p>{t("privacy.email.lead")}</p>
              <div className={styles.links}>
                <Link
                  className="button"
                  href={"/account/settings#preferences" as Route}
                >
                  {t("privacy.email.manage")}
                </Link>
                <Link className="button" href={"/account/saved" as Route}>
                  {t("privacy.email.savedSearches")}
                </Link>
              </div>
            </section>

            <section
              className={styles.section}
              id="data"
              aria-labelledby="data-heading"
            >
              <h2 id="data-heading">{t("privacy.data.title")}</h2>
              <p>{t("privacy.data.lead")}</p>
              <div className={styles.links}>
                <a className="button" href="/api/account/export" download>
                  {t("privacy.data.download")}
                </a>
                <Link
                  className="button"
                  href={"/account/settings#danger" as Route}
                >
                  {t("privacy.data.delete")}
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
