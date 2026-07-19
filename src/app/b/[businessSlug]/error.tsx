"use client";

import Link from "next/link";

export default function BusinessError({ reset }: { reset: () => void }) {
  return (
    <main className="business-site-shell">
      <section className="state-panel" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1>We could not display this business page.</h1>
        <p>Retry the request or return to business discovery.</p>
        <div className="actions">
          <button className="button primary" type="button" onClick={reset}>
            Retry
          </button>
          <Link className="button" href="/businesses">
            Browse businesses
          </Link>
        </div>
      </section>
    </main>
  );
}
