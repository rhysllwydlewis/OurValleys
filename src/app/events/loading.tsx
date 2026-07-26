import { SiteHeader } from "@/components/site-header";

export default function EventsLoading() {
  return (
    <>
      <SiteHeader />
      <main className="directory-shell" aria-busy="true" aria-live="polite">
        <section className="directory-intro">
          <p className="eyebrow">What is happening locally</p>
          <h1>Finding local events…</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading local event results</span>
      </main>
    </>
  );
}
