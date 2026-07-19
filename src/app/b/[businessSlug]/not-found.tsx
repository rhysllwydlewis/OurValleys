import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function BusinessNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="business-site-shell">
        <section className="state-panel">
          <p className="eyebrow">Business not found</p>
          <h1>This published business page does not exist.</h1>
          <p>
            It may be unpublished, archived or the address may be incorrect. We
            never expose draft or restricted records through this route.
          </p>
          <Link className="button primary" href="/businesses">
            Browse published businesses
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
