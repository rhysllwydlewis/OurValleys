import { SiteHeader } from "@/components/site-header";

export default function NewsLoading() {
  return (
    <>
      <SiteHeader />
      <main className="directory-shell" aria-busy="true" aria-live="polite">
        <section className="directory-intro">
          <p className="eyebrow">Latest Welsh news</p>
          <h1>Finding the latest headlines…</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading news headlines</span>
      </main>
    </>
  );
}
