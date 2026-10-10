"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/client";

export default function BusinessError({ reset }: { reset: () => void }) {
  const t = useT();
  return (
    <main className="business-site-shell">
      <section className="state-panel" role="alert">
        <p className="eyebrow">{t("site.page.errorEyebrow")}</p>
        <h1>{t("site.page.errorTitle")}</h1>
        <p>{t("site.page.errorBody")}</p>
        <div className="actions">
          <button className="button primary" type="button" onClick={reset}>
            {t("site.page.retry")}
          </button>
          <Link className="button" href="/businesses">
            {t("site.page.browse")}
          </Link>
        </div>
      </section>
    </main>
  );
}
