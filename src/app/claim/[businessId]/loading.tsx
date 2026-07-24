import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function ClaimBusinessLoading() {
  return (
    <>
      <SiteHeader />
      <main className="business-site-shell" aria-busy="true" aria-live="polite">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href="/businesses">
            <span aria-hidden="true">← </span>
            All local businesses
          </Link>
        </nav>
        <section className="business-section">
          <p className="eyebrow">Ownership claim</p>
          <h1>Loading business details…</h1>
          <div className="skeleton-card" aria-hidden="true" />
          <span className="sr-only">Loading the ownership claim form</span>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
