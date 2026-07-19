import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/" aria-label="OurValleys home">
          <span className="brand__mark" aria-hidden="true">
            OV
          </span>
          <span>OurValleys</span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/businesses">Businesses</Link>
          <Link href="/account">My account</Link>
        </nav>
      </div>
    </header>
  );
}
