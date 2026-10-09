import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { listActiveCategories } from "@/modules/reference-data/categories";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("categories.metaTitle"),
    description: t("categories.metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function CategoriesPage() {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const categories = await listActiveCategories();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section
          className="directory-intro"
          aria-labelledby="categories-title"
          lang={lang}
        >
          <p className="eyebrow">{t("categories.eyebrow")}</p>
          <h1 id="categories-title">{t("categories.title")}</h1>
          <p className="lead">{t("categories.lead")}</p>
        </section>

        {categories.length === 0 ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("categories.unavailableEyebrow")}</p>
            <h2>{t("categories.unavailableTitle")}</h2>
            <p>{t("categories.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("categories.searchBusinesses")}
              </Link>
              <Link className="button" href="/">
                {t("categories.returnHome")}
              </Link>
            </div>
          </section>
        ) : (
          <section
            className="directory-section"
            aria-labelledby="category-list-title"
          >
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("categories.listEyebrow")}</p>
                <h2 id="category-list-title">
                  {categories.length === 1
                    ? t("categories.countOne")
                    : t("categories.countMany", { count: categories.length })}
                </h2>
              </div>
              <p>{t("categories.demoNote")}</p>
            </div>
            <div className="business-grid">
              {categories.map((category) => (
                <article
                  className="business-card business-card--simple"
                  key={category.id}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag" lang={lang}>
                        {t("categories.provisional")}
                      </span>
                    </div>
                    <h3>{category.name}</h3>
                    {category.welshLabel &&
                    category.welshLabel !== category.name ? (
                      <p className="body-copy" lang="cy">
                        {category.welshLabel}
                      </p>
                    ) : null}
                    <p lang={lang}>{t("categories.cardBody")}</p>
                    <Link
                      className="text-link"
                      href={`/categories/${category.slug}` as Route}
                    >
                      {t("categories.explore", { name: category.name })}
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
