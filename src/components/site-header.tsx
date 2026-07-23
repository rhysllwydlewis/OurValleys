import Link from "next/link";
import { SiteHeaderAccountAction, SiteNavLinks } from "@/components/site-nav";

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

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="site-header__inner ov-glass">
          <Link className="brand" href="/" aria-label="OurValleys home">
            <ValleyMark />
            <span className="brand__name">
              Our<em>Valleys</em>
            </span>
          </Link>
          <nav
            className="site-header__desktop-nav"
            aria-label="Primary navigation"
          >
            <SiteNavLinks />
          </nav>
          <div className="site-header__actions site-header__desktop-actions">
            <SiteHeaderAccountAction />
          </div>
          <details className="site-header__mobile-menu">
            <summary aria-label="Open navigation menu">
              <MenuIcon />
            </summary>
            <div className="site-header__mobile-panel ov-glass">
              <nav aria-label="Mobile navigation">
                <SiteNavLinks />
              </nav>
              <div className="site-header__mobile-actions">
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
