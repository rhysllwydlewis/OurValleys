import { SiteHeader } from "@/components/site-header";

export default function BusinessLoading() {
  return (
    <>
      <SiteHeader />
      <main className="business-site-shell" aria-busy="true" aria-live="polite">
        <section className="business-hero">
          <div>
            <p className="eyebrow">Local business website</p>
            <h1>Loading business information…</h1>
          </div>
          <div className="skeleton-card" aria-hidden="true" />
        </section>
        <span className="sr-only">Loading generated business website</span>
      </main>
    </>
  );
}
