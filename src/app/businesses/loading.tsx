import { SiteHeader } from "@/components/site-header";

export default function BusinessesLoading() {
  return (
    <>
      <SiteHeader />
      <main className="directory-shell" aria-busy="true" aria-live="polite">
        <section className="directory-intro">
          <p className="eyebrow">Local business discovery</p>
          <h1>Finding useful local businesses…</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading business results</span>
      </main>
    </>
  );
}
