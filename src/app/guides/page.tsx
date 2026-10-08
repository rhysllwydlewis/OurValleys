import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicPageRobots } from "@/lib/release-stage";
import { listPublicGuides } from "@/modules/guides/public";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("guides.metaTitle"),
    description: t("guides.metaDescription"),
    robots: getPublicPageRobots(),
  };
}

export default async function GuidesPage() {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const result = await listPublicGuides();
  const guides = result.state === "ready" ? result.guides : [];

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section
          className="directory-intro"
          aria-labelledby="guides-title"
          lang={lang}
        >
          <p className="eyebrow">{t("guides.eyebrow")}</p>
          <h1 id="guides-title">{t("guides.title")}</h1>
          <p className="lead">{t("guides.lead")}</p>
        </section>

        <section
          className="directory-section"
          aria-labelledby="guide-list-title"
        >
          <div className="section-heading" lang={lang}>
            <div>
              <p className="eyebrow">{t("guides.listEyebrow")}</p>
              <h2 id="guide-list-title">
                {guides.length === 0
                  ? t("guides.listNone")
                  : guides.length === 1
                    ? t("guides.listOne")
                    : t("guides.listMany", { count: guides.length })}
              </h2>
            </div>
            <p>{t("guides.noPaid")}</p>
          </div>
          {result.state === "unavailable" ? (
            <div className="state-panel" lang={lang}>
              <p>{t("guides.unavailable")}</p>
            </div>
          ) : guides.length === 0 ? (
            <div className="state-panel" lang={lang}>
              <p>{t("guides.empty")}</p>
            </div>
          ) : (
            <div className="business-grid">
              {guides.map((guide) => (
                <article
                  className="business-card business-card--simple"
                  key={guide.slug}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">{guide.area}</span>
                    </div>
                    <h3>{guide.title}</h3>
                    <p>{guide.summary}</p>
                    <p>{guide.readingTime}</p>
                    <Link
                      className="text-link"
                      href={`/guides/${guide.slug}` as Route}
                    >
                      {t("guides.read")}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section
          className="state-panel"
          aria-labelledby="guide-safety-title"
          lang={lang}
        >
          <p className="eyebrow">{t("guides.cantFindEyebrow")}</p>
          <h2 id="guide-safety-title">{t("guides.cantFindTitle")}</h2>
          <p>{t("guides.cantFindBody")}</p>
          <div className="actions">
            <Link className="button primary" href="/businesses">
              {t("guides.searchBusinesses")}
            </Link>
            <Link className="button" href="/events">
              {t("guides.browseEvents")}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
