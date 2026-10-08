import Link from "next/link";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
import { getTranslator } from "@/lib/i18n/server";
import { SiteHeaderAccountAction, SiteNavLinks } from "@/components/site-nav";
import styles from "./site-header-mobile.module.css";

function ValleyMark() {
  return (
    <span className="brand__mark" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 17 8.5 7.5l4 6 3-5 5.5 8.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 19.5h13"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 6h12M4 10h12M4 14h12" />
    </svg>
  );
}

export async function SiteHeader() {
  const { t, locale } = await getTranslator();
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("common.skipToContent")}
      </a>
      <header className="site-header" lang={LOCALE_DETAILS[locale].htmlLang}>
        <div className="site-header__inner ov-glass">
          <Link className="brand" href="/" aria-label={t("brand.home")}>
            <ValleyMark />
            <span className="brand__name">
              Our<em>Valleys</em>
            </span>
          </Link>
          <nav className={styles.desktopNav} aria-label={t("nav.primary")}>
            <SiteNavLinks />
          </nav>
          <div className={`site-header__actions ${styles.desktopActions}`}>
            <LanguageSwitcher />
            <SiteHeaderAccountAction />
          </div>
          <details className={styles.mobileMenu}>
            <summary aria-label={t("nav.openNavigationMenu")}>
              <MenuIcon />
            </summary>
            <div className={`ov-glass ${styles.mobilePanel}`}>
              <nav aria-label={t("nav.mobile")}>
                <SiteNavLinks />
              </nav>
              <div className={styles.mobileActions}>
                <LanguageSwitcher />
                <SiteHeaderAccountAction />
              </div>
            </div>
          </details>
        </div>
      </header>
      <span id="main-content" tabIndex={-1} />
    </>
  );
}
