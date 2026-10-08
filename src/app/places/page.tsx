import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { councilAreas } from "@/data/reference/valleys-places";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("places.metaTitle"),
    description: t("places.metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function PlacesPage() {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const places = await listActivePlaces();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section
          className="directory-intro"
          aria-labelledby="places-title"
          lang={lang}
        >
          <p className="eyebrow">{t("places.eyebrow")}</p>
          <h1 id="places-title">{t("places.title")}</h1>
          <p className="lead">{t("places.lead")}</p>
        </section>

        <section
          className="directory-section"
          aria-labelledby="council-areas-title"
        >
          <div className="section-heading" lang={lang}>
            <div>
              <p className="eyebrow">{t("places.coverageEyebrow")}</p>
              <h2 id="council-areas-title">{t("places.coverageTitle")}</h2>
            </div>
          </div>
          <p className="body-copy" lang={lang}>
            {t("places.coverageBody")}
          </p>
          <div className="business-grid">
            {councilAreas.map((area) => (
              <article
                className="business-card business-card--simple"
                key={area.slug}
              >
                <div className="business-card__body">
                  <h3>{area.name}</h3>
                  <p>{area.description}</p>
                  <Link
                    className="text-link"
                    href={`/places/${area.slug}` as Route}
                  >
                    {t("places.explore", { name: area.name })}
                    <span aria-hidden="true"> →</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {places.length === 0 ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("places.unavailableEyebrow")}</p>
            <h2>{t("places.unavailableTitle")}</h2>
            <p>{t("places.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("places.searchAll")}
              </Link>
              <Link className="button" href="/">
                {t("places.returnHome")}
              </Link>
            </div>
          </section>
        ) : (
          <section
            className="directory-section"
            aria-labelledby="place-list-title"
          >
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("places.listEyebrow")}</p>
                <h2 id="place-list-title">
                  {places.length === 1
                    ? t("places.countOne")
                    : t("places.countMany", { count: places.length })}
                </h2>
              </div>
              <p>{t("places.demoNote")}</p>
            </div>
            <div className="business-grid">
              {places.map((place) => (
                <article
                  className="business-card business-card--simple"
                  key={place.id}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag" lang={lang}>
                        {t("places.provisional")}
                      </span>
                    </div>
                    <h3>{place.name}</h3>
                    <p lang={lang}>{t("places.cardBody")}</p>
                    <Link
                      className="text-link"
                      href={`/places/${place.slug}` as Route}
                    >
                      {t("places.explore", { name: place.name })}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
