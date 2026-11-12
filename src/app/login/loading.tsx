import Link from "next/link";
import { ValleyMark } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import styles from "@/components/auth/auth-shell.module.css";

export default async function LoginLoading() {
  const { locale, t } = await getTranslator();
  return (
    <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
      {/* The same frame as the page, so nothing jumps when it arrives. */}
      <section
        className={styles.layout}
        aria-busy="true"
        aria-live="polite"
        aria-labelledby="login-loading-title"
      >
        <div className={styles.photo} aria-hidden="true" />
        <div className={styles.intro}>
          <Link className={styles.brand} href="/" aria-label={t("brand.home")}>
            <ValleyMark />
            <span>OurValleys</span>
          </Link>
          <p className={styles.eyebrow}>{t("loading.login.eyebrow")}</p>
          <h1 id="login-loading-title">{t("loading.login.title")}</h1>
        </div>
        <div className={styles.panel}>
          <div className="skeleton-card" aria-hidden="true" />
          <span className="sr-only">{t("loading.login.hint")}</span>
        </div>
      </section>
    </main>
  );
}
