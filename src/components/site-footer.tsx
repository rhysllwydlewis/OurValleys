import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong className="ov-display">OurValleys</strong>
          <p>Independent local discovery for Rhondda Cynon Taf.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/businesses">Browse businesses</Link>
          <Link href="/news">Latest news</Link>
          <Link href="/login">Sign in</Link>
          <a href="mailto:corrections@ourvalleys.example">
            Report incorrect information
          </a>
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
