"use client";

import Link from "next/link";
import "./globals.css";
import "./design-system.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en-GB">
      <body>
        <main className="page-shell">
          <section className="state-panel" role="alert">
            <p className="eyebrow">Something went wrong</p>
            <h1>OurValleys hit an unexpected error.</h1>
            <p>
              No information has been lost. Try again, or return to the
              homepage.
            </p>
            <div className="actions">
              <button className="button primary" type="button" onClick={reset}>
                Try again
              </button>
              <Link className="button" href="/">
                Return home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
