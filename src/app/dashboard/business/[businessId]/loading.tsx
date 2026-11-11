import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

export default async function BusinessDashboardLoading() {
  const { locale, t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main
        className="dashboard-shell"
        aria-busy="true"
        aria-live="polite"
        lang={LOCALE_DETAILS[locale].htmlLang}
      >
        <section className="dashboard-hero">
          <p className="eyebrow">{t("dash.loading.eyebrow")}</p>
          <h1>{t("dash.loading.title")}</h1>
        </section>
        {/* Holds the sidebar's place so the page does not jump sideways
            when the real navigation streams in. */}
        <div
          className="dashboard-nav dashboard-nav--placeholder"
          aria-hidden="true"
          data-print="hide"
        />
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">{t("dash.loading.sr")}</span>
      </main>
      <SiteFooter />
    </>
  );
}
