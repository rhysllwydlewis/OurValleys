import Link from "next/link";

/**
 * Business-first chrome for the generated public website (docs/32 §6.2):
 * the visitor should feel they have arrived at the business's own site, so
 * there is no platform directory header. Navigation is generated from the
 * visible sections, and platform attribution lives in a medium, tasteful
 * "Powered by OurValleys" footer (docs/32 §17.2).
 */

export type BusinessSiteSection = {
  id: string;
  label: string;
};

export function BusinessSiteHeader({
  tradingName,
  sections,
  primaryAction,
}: {
  tradingName: string;
  sections: BusinessSiteSection[];
  primaryAction: { href: string; label: string } | null;
}) {
  return (
    <header className="business-site-header">
      <a className="business-site-header__brand" href="#business-title">
        {tradingName}
      </a>
      <nav
        className="business-site-header__nav"
        aria-label="Business page sections"
      >
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>
      {primaryAction ? (
        <a
          className="button primary business-site-header__action"
          href={primaryAction.href}
        >
          {primaryAction.label}
        </a>
      ) : null}
    </header>
  );
}

export function BusinessSiteFooter({ tradingName }: { tradingName: string }) {
  return (
    <footer className="business-site-footer">
      <p className="business-site-footer__name">{tradingName}</p>
      <div className="business-site-footer__powered">
        <Link href="/" className="powered-by">
          <span className="powered-by__mark" aria-hidden="true">
            OV
          </span>
          <span>
            Powered by <strong>OurValleys</strong>
          </span>
        </Link>
        <nav aria-label="OurValleys links">
          <Link href="/businesses">Find more local businesses</Link>
        </nav>
      </div>
    </footer>
  );
}
