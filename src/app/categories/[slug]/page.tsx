import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRatingTag } from "@/components/business-rating-tag";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { businessCardArtStyle } from "@/lib/business-card-art";
import { getInitials } from "@/lib/initials";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { listActiveCategories } from "@/modules/reference-data/categories";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getTranslator();
  const categories = await listActiveCategories();
  const selectedCategory = categories.find(
    (category) => category.slug === slug,
  );

  return {
    title: selectedCategory
      ? t("category.metaTitle", { name: selectedCategory.name })
      : t("category.notFoundTitle"),
    description: selectedCategory
      ? t("category.metaDescription", { name: selectedCategory.name })
      : t("category.notFoundDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const categories = await listActiveCategories();
  const selectedCategory = categories.find(
    (category) => category.slug === slug,
  );
  if (!selectedCategory) notFound();

  const result = await listPublishedBusinesses({
    category: selectedCategory.slug,
  });

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section
          className="directory-intro"
          aria-labelledby="category-title"
          lang={lang}
        >
          <p className="eyebrow">{t("category.eyebrow")}</p>
          <h1 id="category-title">{selectedCategory.name}</h1>
          {selectedCategory.welshLabel &&
          selectedCategory.welshLabel !== selectedCategory.name ? (
            <p className="body-copy" lang="cy">
              {selectedCategory.welshLabel}
            </p>
          ) : null}
          <p className="lead">{t("category.lead")}</p>
          <div className="actions">
            <Link
              className="button primary"
              href={`/businesses?category=${selectedCategory.slug}` as Route}
            >
              {t("category.search", { name: selectedCategory.name })}
            </Link>
            <Link className="button" href="/categories">
              {t("category.browseAll")}
            </Link>
          </div>
        </section>

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("category.unavailableEyebrow")}</p>
            <h2>{t("category.unavailableTitle")}</h2>
            <p>{t("category.unavailableBody")}</p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("category.emptyEyebrow")}</p>
            <h2>{t("category.emptyTitle")}</h2>
            <p>{t("category.emptyBody")}</p>
            <Link className="button primary" href="/businesses">
              {t("category.exploreAll")}
            </Link>
          </section>
        ) : (
          <section aria-labelledby="category-results-title">
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("category.resultsEyebrow")}</p>
                <h2 id="category-results-title">
                  {result.businesses.length === 1
                    ? t("category.countOne")
                    : t("category.countMany", {
                        count: result.businesses.length,
                      })}
                </h2>
              </div>
              <p>{t("category.organic")}</p>
            </div>
            <div className="business-grid">
              {result.businesses.map((business) => (
                <article className="business-card" key={business.id}>
                  <div
                    className="business-card__art"
                    aria-hidden="true"
                    style={businessCardArtStyle(business.cardImage)}
                  >
                    {business.cardImage ? null : (
                      <span className="business-card__initials">
                        {getInitials(business.tradingName)}
                      </span>
                    )}
                    <span>{business.place.name}</span>
                  </div>
                  <div className="business-card__body">
                    <div className="tag-row">
                      {business.isDemo ? (
                        <span className="tag" lang={lang}>
                          {t("category.fictionalDemo")}
                        </span>
                      ) : null}
                      <BusinessRatingTag rating={business.rating} />
                    </div>
                    <h3>{business.tradingName}</h3>
                    {business.welshName &&
                    business.welshName !== business.tradingName ? (
                      <p className="body-copy" lang="cy">
                        {business.welshName}
                      </p>
                    ) : null}
                    <p>{business.summary}</p>
                    <Link
                      className="text-link"
                      href={`/b/${business.slug}` as Route}
                    >
                      {t("category.viewSite")}
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
