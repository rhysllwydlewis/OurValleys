import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import styles from "./account.module.css";

export default async function AccountLoading() {
  const { locale, t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main
        className={styles.shell}
        aria-busy="true"
        aria-live="polite"
        lang={LOCALE_DETAILS[locale].htmlLang}
      >
        <p className={styles.eyebrow}>{t("account.eyebrow")}</p>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">{t("account.loading")}</span>
      </main>
      <SiteFooter />
    </>
  );
}
