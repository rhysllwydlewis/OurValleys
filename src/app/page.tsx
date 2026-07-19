import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { readScaffoldProof } from "@/modules/scaffold/proof";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const proof = await readScaffoldProof();

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="hero" aria-labelledby="home-title">
          <p className="eyebrow">Rhondda Cynon Taf</p>
          <h1 id="home-title">Everything local, all in one place.</h1>
          <p className="lead">
            OurValleys is building a trusted way to discover local businesses,
            events, places and useful information.
          </p>
          <div className="actions">
            <Link className="button primary" href="/businesses">
              Browse local businesses
            </Link>
            <Link className="button" href="/account">
              Open protected route
            </Link>
          </div>
        </section>

        <section className="proof" aria-labelledby="proof-title">
          <div>
            <p className="eyebrow">Connected foundation</p>
            <h2 id="proof-title">
              One business record now powers discovery and its website.
            </h2>
          </div>
          <dl>
            <div>
              <dt>Server rendering</dt>
              <dd>Active</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>{proof.state === "ready" ? proof.value : "Unavailable"}</dd>
            </div>
            <div>
              <dt>Public data</dt>
              <dd>Private fields excluded by projection</dd>
            </div>
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
