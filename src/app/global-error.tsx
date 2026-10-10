"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  LOCALE_DETAILS,
  localeFromBrowser,
  type Locale,
} from "@/lib/i18n/config";
import { publicPagesCy, publicPagesEn } from "@/lib/i18n/messages/public-pages";
import "./globals.css";
import "./design-system.css";

const subscribe = () => () => {};
const readLocale = (): Locale =>
  localeFromBrowser(document.cookie, navigator.languages);
const serverLocale = (): Locale => "en";

// This boundary replaces the whole layout, so there is no locale provider:
// read the visitor's chosen language from a script-readable cookie copy (the
// real cookie is httpOnly), falling back to the browser's languages.
export default function GlobalError({ reset }: { reset: () => void }) {
  const locale = useSyncExternalStore(subscribe, readLocale, serverLocale);
  // Only this module is bundled here, not the whole catalogue.
  const messages = locale === "cy" ? publicPagesCy : publicPagesEn;
  const t = (key: keyof typeof publicPagesEn) => messages[key];
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;

  return (
    <html lang={htmlLang}>
      <body>
        <main className="page-shell">
          <section className="state-panel" role="alert">
            <p className="eyebrow">{t("error.eyebrow")}</p>
            <h1>{t("error.globalTitle")}</h1>
            <p>{t("error.globalBody")}</p>
            <div className="actions">
              <button className="button primary" type="button" onClick={reset}>
                {t("error.globalRetry")}
              </button>
              <Link className="button" href="/">
                {t("error.home")}
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
