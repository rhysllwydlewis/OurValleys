import { getTranslator } from "@/lib/i18n/server";

export default async function BusinessLoading() {
  const { t } = await getTranslator();
  return (
    <main className="business-site-shell" aria-busy="true" aria-live="polite">
      <section className="business-hero">
        <div>
          <p className="eyebrow">{t("site.page.loadingEyebrow")}</p>
          <h1>{t("site.page.loadingTitle")}</h1>
        </div>
        <div className="skeleton-card" aria-hidden="true" />
      </section>
      <span className="sr-only">{t("site.page.loadingHint")}</span>
    </main>
  );
}
