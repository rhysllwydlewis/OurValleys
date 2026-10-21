import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/translate";

export const metadata: Metadata = {
  title: "You are offline / Rydych all-lein",
  robots: { index: false },
};

const locales = ["en", "cy"] as const;

// The service worker caches this page once, so it shows both languages rather
// than the locale that happened to be chosen at install time. The retry
// control is a plain link because the page's JavaScript may not be cached.
export default function OfflinePage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        {locales.map((locale) => {
          const m = getMessages(locale) as Record<string, string>;
          return (
            <section
              className="state-panel"
              key={locale}
              lang={LOCALE_DETAILS[locale].htmlLang}
            >
              <p className="eyebrow">{m["offline.eyebrow"]}</p>
              <h1>{m["offline.title"]}</h1>
              <p>{m["offline.body"]}</p>
              <div className="actions">
                <Link className="button primary" href="/" prefetch={false}>
                  {m["offline.retry"]}
                </Link>
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
