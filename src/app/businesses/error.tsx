"use client";

import Link from "next/link";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";

export default function BusinessesError({ reset }: { reset: () => void }) {
  const { locale, t } = useLocale();
  return (
    <main className="directory-shell" lang={LOCALE_DETAILS[locale].htmlLang}>
      <section className="state-panel" role="alert">
        <p className="eyebrow">{t("error.eyebrow")}</p>
        <h1>{t("error.businessesTitle")}</h1>
        <p>{t("error.businessesBody")}</p>
        <div className="actions">
          <button className="button primary" type="button" onClick={reset}>
            {t("error.retry")}
          </button>
          <Link className="button" href="/">
            {t("error.home")}
          </Link>
        </div>
      </section>
    </main>
  );
}
