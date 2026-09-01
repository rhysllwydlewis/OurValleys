import Link from "next/link";
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

export function BusinessSiteHeader({
  tradingName,
  logo,
  sections,
  primaryAction,
}: {
  tradingName: string;
  logo: BusinessSiteLogo;
  sections: BusinessSiteSection[];
  primaryAction: { href: string; label: string } | null;
}) {
  const hasMobileMenu = sections.length > 0 || primaryAction !== null;

  return (
    <>
      <a className={styles.skipLink} href="#business-skip-target">
        Skip to main content
      </a>
      <header className={styles.header}>
        <a className={styles.brand} href="#business-title">
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
            aria-label="Business page sections"
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
            <summary aria-label="Open navigation menu">
              <MenuIcon />
            </summary>
            <div className={styles.mobilePanel}>
              {sections.length > 0 ? (
                <nav aria-label="Business page sections">
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
        Main business content begins
      </span>
    </>
  );
}

export function BusinessSiteFooter({ tradingName }: { tradingName: string }) {
  return (
    <footer className={styles.footer}>
      <div>
        <p className={styles.footerName}>{tradingName}</p>
        <p className={styles.footerNote}>
          Business information supplied and maintained through OurValleys.
        </p>
      </div>
      <div className={styles.poweredArea}>
        <Link href="/" className={styles.poweredBy}>
          <span className={styles.poweredMark} aria-hidden="true">
            OV
          </span>
          <span>
            Powered by <strong>OurValleys</strong>
          </span>
        </Link>
        <Link href="/businesses" className={styles.platformLink}>
          Find more local businesses
        </Link>
      </div>
    </footer>
  );
}
