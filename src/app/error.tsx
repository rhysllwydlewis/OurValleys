"use client";

import Link from "next/link";

// Segment boundary for every route without its own error.tsx (homepage, events,
// offers, places, guides, categories, account, dashboard, admin). Without it a
// failed data load falls through to global-error, which replaces the whole layout.
export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <main className="directory-shell">
      <section className="state-panel" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1>We could not load this page.</h1>
        <p>No information has been lost. Retry or browse local businesses.</p>
        <div className="actions">
          <button className="button primary" type="button" onClick={reset}>
            Retry
          </button>
          <Link className="button" href="/">
            Return home
          </Link>
          <Link className="button" href="/businesses">
            Browse businesses
          </Link>
        </div>
      </section>
    </main>
  );
}
