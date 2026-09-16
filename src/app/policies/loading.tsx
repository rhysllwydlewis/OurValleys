import { SiteHeader } from "@/components/site-header";

export default function PoliciesLoading() {
  return (
    <>
      <SiteHeader />
      <main className="directory-shell" aria-busy="true" aria-live="polite">
        <section className="directory-intro">
          <p className="eyebrow">Trust and accountability</p>
          <h1>Finding OurValleys policies…</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading policy documents</span>
      </main>
    </>
  );
}
