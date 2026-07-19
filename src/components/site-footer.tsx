import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <strong>OurValleys</strong>
          <p>Local discovery for Rhondda Cynon Taf.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/businesses">Browse businesses</Link>
          <a href="mailto:corrections@ourvalleys.example">
            Report incorrect information
          </a>
        </nav>
      </div>
    </footer>
  );
}
