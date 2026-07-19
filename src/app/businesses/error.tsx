"use client";

import Link from "next/link";

export default function BusinessesError({ reset }: { reset: () => void }) {
  return (
    <main className="directory-shell">
      <section className="state-panel" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1>We could not load business discovery.</h1>
        <p>No information has been lost. Retry or return to the homepage.</p>
        <div className="actions">
          <button className="button primary" type="button" onClick={reset}>
            Retry
          </button>
          <Link className="button" href="/">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
