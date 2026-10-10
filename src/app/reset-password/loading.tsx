import Link from "next/link";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import styles from "../login.module.css";

export default async function ResetPasswordLoading() {
  const { locale, t } = await getTranslator();
  return (
    <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
      <section
        className={styles.card}
        aria-busy="true"
        aria-live="polite"
        aria-labelledby="reset-loading-title"
      >
        <Link className={styles.brand} href="/" aria-label={t("brand.home")}>
          <span className={styles.mark} aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <p className={styles.eyebrow}>{t("loading.reset.eyebrow")}</p>
        <h1 id="reset-loading-title">{t("loading.reset.title")}</h1>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">{t("loading.reset.hint")}</span>
      </section>
    </main>
  );
}
