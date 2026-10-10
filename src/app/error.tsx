"use client";

import Link from "next/link";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";

// Segment boundary for every route without its own error.tsx (homepage, events,
// offers, places, guides, categories, account, dashboard, admin). Without it a
// failed data load falls through to global-error, which replaces the whole layout.
export default function RouteError({ reset }: { reset: () => void }) {
  const { locale, t } = useLocale();
  return (
    <main className="directory-shell" lang={LOCALE_DETAILS[locale].htmlLang}>
      <section className="state-panel" role="alert">
        <p className="eyebrow">{t("error.eyebrow")}</p>
        <h1>{t("error.title")}</h1>
        <p>{t("error.body")}</p>
        <div className="actions">
          <button className="button primary" type="button" onClick={reset}>
            {t("error.retry")}
          </button>
          <Link className="button" href="/">
            {t("error.home")}
          </Link>
          <Link className="button" href="/businesses">
            {t("error.browse")}
          </Link>
        </div>
      </section>
    </main>
  );
}
