import { SiteHeader } from "@/components/site-header";

export default function OffersLoading() {
  return (
    <>
      <SiteHeader />
      <main className="directory-shell" aria-busy="true" aria-live="polite">
        <section className="directory-intro">
          <p className="eyebrow">Supplied by local businesses</p>
          <h1>Finding local offers…</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading local offers</span>
      </main>
    </>
  );
}
