import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function BusinessDashboardLoading() {
  return (
    <>
      <SiteHeader />
      <main className="dashboard-shell" aria-busy="true" aria-live="polite">
        <section className="dashboard-hero">
          <p className="eyebrow">Your business</p>
          <h1>Loading your dashboard…</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">Loading your business dashboard</span>
      </main>
      <SiteFooter />
    </>
  );
}
