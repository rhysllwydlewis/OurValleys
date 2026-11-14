import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { saveDisplayAction } from "@/lib/display/actions";
import {
  DISPLAY_GROUPS,
  DISPLAY_OPTIONS,
  type DisplayGroup,
} from "@/lib/display/preferences";
import { getDisplayPreferences } from "@/lib/display/server";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { getPublicPageRobots } from "@/lib/release-stage";
import { pageUrlMetadata } from "@/lib/site";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getTranslator();
  return {
    title: t("display.metaTitle"),
    description: t("display.lead"),
    robots: getPublicPageRobots(),
    ...pageUrlMetadata("/display", {
      title: t("display.metaTitle"),
      description: t("display.lead"),
      locale: LOCALE_DETAILS[locale].openGraph,
    }),
  };
}

export default async function DisplayPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; reset?: string }>;
}) {
  const [{ locale, t }, prefs, query] = await Promise.all([
    getTranslator(),
    getDisplayPreferences(),
    searchParams,
  ]);
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const banner = query.saved
    ? t("display.saved")
    : query.reset
      ? t("display.reset")
      : null;

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={lang}>
        <header>
          <p className="eyebrow">{t("display.eyebrow")}</p>
          <h1>{t("display.title")}</h1>
          <p>{t("display.lead")}</p>
        </header>

        {banner ? (
          <p className={styles.banner} role="status">
            {banner}
          </p>
        ) : null}

        <form action={saveDisplayAction} className={styles.form}>
          {DISPLAY_GROUPS.map((group: DisplayGroup) => (
            <fieldset
              key={group}
              className={styles.group}
              aria-describedby={`display-hint-${group}`}
            >
              <legend>{t(`display.group.${group}` as MessageKey)}</legend>
              <p id={`display-hint-${group}`} className={styles.hint}>
                {t(`display.hint.${group}` as MessageKey)}
              </p>
              <div className={styles.options}>
                {DISPLAY_OPTIONS[group].map((option) => (
                  <label key={option} className={styles.option}>
                    <input
                      type="radio"
                      name={group}
                      value={option}
                      defaultChecked={prefs[group] === option}
                    />
                    <span>{t(`display.${group}.${option}` as MessageKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <section className={styles.sample} aria-labelledby="display-sample">
            <p className="eyebrow" id="display-sample">
              {t("display.sample.title")}
            </p>
            <h2>{t("display.sample.heading")}</h2>
            <p>{t("display.sample.body")}</p>
            <p>
              <Link href="/policies/accessibility">
                {t("display.sample.link")}
              </Link>
            </p>
          </section>

          <div className={styles.actions}>
            <button type="submit" className={styles.primary}>
              {t("display.save")}
            </button>
            <button
              type="submit"
              name="intent"
              value="reset"
              className={styles.secondary}
            >
              {t("display.resetButton")}
            </button>
          </div>
        </form>

        <p className={styles.note}>
          {t("display.footerNote")}{" "}
          <Link href="/policies/accessibility">
            {t("display.statementLink")}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
