import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import styles from "./generated-business-website.module.css";

/** Business-first chrome for generated websites (docs/32 §6.2, §17.2). */
export type BusinessSiteSection = {
  id: string;
  label: string;
};

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M4 6h12M4 10h12M4 14h12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type BusinessSiteLogo = {
  url: string;
  altText: string;
  focalX: number;
  focalY: number;
} | null;

export async function BusinessSiteHeader({
  tradingName,
  logo,
  sections,
  primaryAction,
  homeHref = "#business-title",
}: {
  tradingName: string;
  logo: BusinessSiteLogo;
  sections: BusinessSiteSection[];
  primaryAction: { href: string; label: string } | null;
  /**
   * Where the brand mark links to. Defaults to the in-page hero anchor used
   * on the business home page itself; subpages that don't render that
   * anchor (contact, QR) must pass the business's own URL instead.
   */
  homeHref?: string;
}) {
  const { t } = await getTranslator();
  const hasMobileMenu = sections.length > 0 || primaryAction !== null;

  return (
    <>
      <a
        className={styles.skipLink}
        data-print="hide"
        href="#business-skip-target"
      >
        {t("site.skip")}
      </a>
      <header className={styles.header} data-print="hide">
        <a className={styles.brand} href={homeHref}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.logo}
              src={logo.url}
              alt=""
              aria-hidden="true"
              style={{ objectPosition: `${logo.focalX}% ${logo.focalY}%` }}
            />
          ) : (
            <span className={styles.logoPlaceholder} aria-hidden="true">
              {tradingName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span>{tradingName}</span>
        </a>

        {sections.length > 0 ? (
          <nav
            className={`${styles.navigation} ${styles.desktopOnly}`}
            aria-label={t("site.sectionsNav")}
          >
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.label}
              </a>
            ))}
          </nav>
        ) : null}

        {primaryAction ? (
          <a
            className={`${styles.headerAction} ${styles.desktopOnly}`}
            href={primaryAction.href}
          >
            {primaryAction.label}
          </a>
        ) : null}

        {hasMobileMenu ? (
          <details className={styles.mobileMenu}>
            <summary aria-label={t("site.openMenu")}>
              <MenuIcon />
            </summary>
            <div className={styles.mobilePanel}>
              {sections.length > 0 ? (
                <nav aria-label={t("site.sectionsNav")}>
                  {sections.map((section) => (
                    <a key={section.id} href={`#${section.id}`}>
                      {section.label}
                    </a>
                  ))}
                </nav>
              ) : null}
              {primaryAction ? (
                <a className={styles.headerAction} href={primaryAction.href}>
                  {primaryAction.label}
                </a>
              ) : null}
            </div>
          </details>
        ) : null}
      </header>
      <span id="business-skip-target" className="sr-only" tabIndex={-1}>
        {t("site.mainBegins")}
      </span>
    </>
  );
}

export async function BusinessSiteFooter({
  tradingName,
}: {
  tradingName: string;
}) {
  const { t } = await getTranslator();
  return (
    <footer className={styles.footer} data-print="hide">
      <div>
        <p className={styles.footerName}>{tradingName}</p>
        <p className={styles.footerNote}>{t("site.footerNote")}</p>
      </div>
      <div className={styles.poweredArea}>
        <Link href="/" className={styles.poweredBy}>
          <span className={styles.poweredMark} aria-hidden="true">
            OV
          </span>
          <span>
            {t("site.poweredBefore")}
            <strong>OurValleys</strong>
          </span>
        </Link>
        <Link href="/businesses" className={styles.platformLink}>
          {t("site.findMore")}
        </Link>
      </div>
    </footer>
  );
}
