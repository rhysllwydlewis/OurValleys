import Link from "next/link";
import { readScaffoldProof } from "@/modules/scaffold/proof";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const proof = await readScaffoldProof();

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">Rhondda Cynon Taf</p>
        <h1 id="home-title">Everything local, all in one place.</h1>
        <p className="lead">
          OurValleys is building a trusted way to discover local businesses,
          events, places and useful information.
        </p>
        <div className="actions">
          <Link className="button primary" href="/account">
            Open protected route
          </Link>
          <Link className="button" href="/api/health">
            View health check
          </Link>
        </div>
      </section>

      <section className="proof" aria-labelledby="proof-title">
        <div>
          <p className="eyebrow">Scaffold proof</p>
          <h2 id="proof-title">Production foundations are connected.</h2>
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
            <dt>Worker</dt>
            <dd>Separate pg-boss entry point</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
