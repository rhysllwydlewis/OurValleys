import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicPageRobots } from "@/lib/release-stage";
import { getPublicGuideBySlug } from "@/modules/guides/public";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getTranslator();
  const guide = await getPublicGuideBySlug(slug);

  return {
    title: guide ? guide.title : t("guide.notFoundTitle"),
    description: guide ? guide.summary : t("guide.notFoundDescription"),
    robots: guide ? getPublicPageRobots() : { index: false, follow: false },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const guide = await getPublicGuideBySlug(slug);
  if (!guide) notFound();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="guide-title">
          <p className="eyebrow" lang={lang}>
            {t("guide.eyebrow")}
          </p>
          <h1 id="guide-title">{guide.title}</h1>
          <p className="lead">{guide.summary}</p>
          <div className="tag-row" aria-label={t("guide.detailsAria")}>
            <span className="tag">{guide.area}</span>
            <span className="tag">{guide.readingTime}</span>
            <span className="tag" lang={lang}>
              {t("guide.by", { name: guide.authorName })}
            </span>
          </div>
          {guide.sponsorshipDisclosure ? (
            <p className="hint">{guide.sponsorshipDisclosure}</p>
          ) : null}
          <div className="actions">
            <Link className="button" href="/guides">
              <span lang={lang}>{t("guide.browseAll")}</span>
            </Link>
            <Link className="button primary" href="/businesses">
              <span lang={lang}>{t("guide.searchDirectory")}</span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="guide-sections-title">
          <div className="section-heading" lang={lang}>
            <div>
              <p className="eyebrow">{t("guide.sectionsEyebrow")}</p>
              <h2 id="guide-sections-title">{t("guide.sectionsTitle")}</h2>
            </div>
          </div>
          <div className="business-grid">
            {guide.sections.map((section, index) => (
              <article
                className="business-card business-card--simple"
                key={section.heading}
              >
                <div className="business-card__body">
                  <div className="tag-row">
                    <span className="tag" lang={lang}>
                      {t("guide.step", { number: index + 1 })}
                    </span>
                  </div>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                  <Link className="text-link" href={section.href as Route}>
                    {section.linkLabel}
                    <span aria-hidden="true"> →</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
