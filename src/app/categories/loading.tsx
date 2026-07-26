import { SiteHeader } from "@/components/site-header";

export default function CategoriesLoading() {
  return (
    <>
      <SiteHeader />
      <main className="directory-shell" aria-busy="true" aria-live="polite">
        <section className="directory-intro">
          <p className="eyebrow">Explore by category</p>
          <h1>Finding local categories…</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading category results</span>
      </main>
    </>
  );
}
