import { SiteHeader } from "@/components/site-header";

export default function GuidesLoading() {
  return (
    <>
      <SiteHeader />
      <main className="directory-shell" aria-busy="true" aria-live="polite">
        <section className="directory-intro">
          <p className="eyebrow">Explore local guide concepts</p>
          <h1>Finding local guides…</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading local guides</span>
      </main>
    </>
  );
}
