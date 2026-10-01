import Link from "next/link";
import { SiteFooterAccountLink } from "@/components/site-nav";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong className="ov-display">OurValleys</strong>
          <p>Independent local discovery for the South Wales Valleys.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/businesses">Browse businesses</Link>
          <Link href="/places">Explore places</Link>
          <Link href="/events">Local events</Link>
          <Link href="/news">Latest news</Link>
          <SiteFooterAccountLink />
        </nav>
        <nav aria-label="Policies and accountability">
          <Link href="/policies/privacy">Privacy</Link>
          <Link href="/policies/terms">Terms</Link>
          <Link href="/policies/accessibility">Accessibility</Link>
          <Link href="/policies/content-guidelines">Content guidelines</Link>
          <Link href="/policies/corrections">Corrections</Link>
          <Link href="/policies/advertising">Advertising</Link>
        </nav>
      </div>
      <div className="site-footer__legal">
        <p>
          OurValleys is independent and is not operated or endorsed by any
          council, public body or external publisher. Business content shown
          during the build is clearly labelled fictional demonstration data.
          Made in the Valleys.
        </p>
      </div>
    </footer>
  );
}
