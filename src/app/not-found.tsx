import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="state-panel">
          <p className="eyebrow">Page not found</p>
          <h1>We could not find that page.</h1>
          <p>
            The link may be out of date or the page may have moved. Try browsing
            local businesses or head back to the homepage.
          </p>
          <div className="actions">
            <Link className="button primary" href="/">
              Return home
            </Link>
            <Link className="button" href="/businesses">
              Browse businesses
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
