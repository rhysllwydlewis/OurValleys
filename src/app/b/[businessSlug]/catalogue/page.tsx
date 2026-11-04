import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import { businessSiteTheme } from "@/components/business-site-theme";
import { ContentPicture } from "@/components/content-picture";
import siteStyles from "@/components/generated-business-website.module.css";
import styles from "@/components/business-catalogue-index.module.css";
import extraStyles from "@/components/business-extra-sections.module.css";
import { JsonLd } from "@/components/json-ld";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { getSiteUrl, pageUrlMetadata } from "@/lib/site";
import { buildCatalogueListJsonLd } from "@/lib/structured-data";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import {
  buildCatalogueIndex,
  catalogueTypes,
  entryPagePath,
  hasActiveFilters,
  maxCatalogueItems,
  maxSearchLength,
  parseCatalogueFilters,
} from "@/modules/businesses/catalogue-page-model";
import { listCategorySections } from "@/modules/businesses/content-features";
import {
  localiseSections,
  publicExtraSections,
  splitPriceMeta,
} from "@/modules/businesses/extra-sections-model";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { resolvePublishedBusinessRedirect } from "@/modules/businesses/public-operations";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessSlug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const load = cache(async function load(businessSlug: string) {
  const result = await getPublishedBusinessBySlug(businessSlug);
  if (result.state !== "ready") return { result, sections: null };
  const sections = publicExtraSections(
    await listCategorySections(result.business.id, true),
  );
  return { result, sections };
});

const typeLabelKey = {
  products: "extra.catalogue.typeProducts",
  treatments: "extra.catalogue.typeTreatments",
  team: "extra.catalogue.typeTeam",
} as const;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const filters = parseCatalogueFilters(await searchParams);
  const [{ result, sections }, { t, locale }] = await Promise.all([
    load(businessSlug),
    getTranslator(),
  ]);
  if (result.state !== "ready" || !sections) {
    return {
      title: t("site.page.metaUnavailable"),
      robots: { index: false, follow: false },
    };
  }
  const { business } = result;
  const title = t("extra.catalogue.metaTitle", {
    business: business.tradingName,
  });
  const description = t("extra.catalogue.metaDescription", {
    business: business.tradingName,
  });
  const base = pageUrlMetadata(`/b/${business.slug}/catalogue`, {
    title,
    description,
    locale: LOCALE_DETAILS[locale].openGraph,
  });
  return {
    title,
    description,
    alternates: base.alternates,
    openGraph: base.openGraph,
    // Filtered views are the same list again, so only the plain page is indexed.
    robots:
      business.isDemo || hasActiveFilters(filters)
        ? { index: false, follow: true }
        : { index: true, follow: true },
  };
}

export default async function BusinessCataloguePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { businessSlug } = await params;
  const filters = parseCatalogueFilters(await searchParams);
  const [{ result, sections }, { locale, t }] = await Promise.all([
    load(businessSlug),
    getTranslator(),
  ]);
  if (result.state === "missing") {
    // An approved slug change keeps old shared links working.
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) permanentRedirect(`/b/${redirectSlug}/catalogue`);
  }
  if (result.state !== "ready" || !sections) notFound();
  const { business } = result;
  const index = buildCatalogueIndex(
    localiseSections(sections, locale),
    filters,
  );
  // A business with nothing to list has no catalogue page.
  if (index.total === 0) notFound();
  const [media, appearance] = await Promise.all([
    listBusinessMedia(business.id),
    getBusinessAppearance(business.id),
  ]);
  const theme = businessSiteTheme(appearance);
  const authoredLang = locale === "cy" ? "en-GB" : undefined;
  const filtered = hasActiveFilters(filters);
  const basePath: `/b/${string}/catalogue` = `/b/${business.slug}/catalogue`;
  const flat = index.sections.flatMap((section) =>
    section.groups.flatMap((group) => group.entries),
  );

  return (
    <div
      className={`${siteStyles.site} business-catalogue-index`}
      lang={LOCALE_DETAILS[locale].htmlLang}
      {...theme.attributes}
      style={theme.style}
    >
      <BusinessSiteHeader
        tradingName={business.tradingName}
        logo={media.logo}
        sections={[]}
        primaryAction={null}
        homeHref={`/b/${business.slug}`}
      />
      <main className="business-site-shell" id="business-content">
        <nav
          className="business-breadcrumb"
          aria-label={t("formsCommon.breadcrumb")}
        >
          <Link href={`/b/${business.slug}`}>
            {t("extra.catalogue.back", { business: business.tradingName })}
          </Link>
        </nav>
        <header className={styles.head}>
          <h1>{t("extra.catalogue.heading")}</h1>
          <p className={styles.intro}>
            {t("extra.catalogue.intro", { business: business.tradingName })}
          </p>
        </header>
        <form
          // Remounted when the filters in the address change, so a client-side
          // "Clear filters" also resets the uncontrolled fields.
          key={JSON.stringify(filters)}
          className={styles.filters}
          method="get"
          action={basePath}
          role="search"
          aria-label={t("extra.catalogue.filtersLabel")}
          data-testid="catalogue-filters"
        >
          <div className={styles.filterGrid}>
            <div className={styles.field}>
              <label htmlFor="catalogue-q">
                {t("extra.catalogue.searchLabel")}
              </label>
              <input
                id="catalogue-q"
                name="q"
                type="search"
                maxLength={maxSearchLength}
                defaultValue={filters.q}
                autoComplete="off"
              />
            </div>
            {index.types.length > 1 ? (
              <div className={styles.field}>
                <label htmlFor="catalogue-type">
                  {t("extra.catalogue.typeLabel")}
                </label>
                <select
                  id="catalogue-type"
                  name="type"
                  defaultValue={filters.type ?? ""}
                >
                  <option value="">{t("extra.catalogue.typeAll")}</option>
                  {catalogueTypes
                    .filter((type) =>
                      index.types.some((entry) => entry.type === type),
                    )
                    .map((type) => (
                      <option key={type} value={type}>
                        {t(typeLabelKey[type])}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
            {index.categories.length > 0 ? (
              <div className={styles.field}>
                <label htmlFor="catalogue-category">
                  {t("extra.catalogue.categoryLabel")}
                </label>
                <select
                  id="catalogue-category"
                  name="category"
                  defaultValue={filters.category ?? ""}
                >
                  <option value="">{t("extra.catalogue.categoryAll")}</option>
                  {index.categories.map((category) => (
                    <option
                      key={category.key}
                      value={category.key}
                      lang={authoredLang}
                    >
                      {category.name} ({category.count})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              name="stock"
              value="1"
              defaultChecked={filters.inStockOnly}
            />
            {t("extra.catalogue.stockOnly")}
          </label>
          <div className={styles.filterActions}>
            <button className={siteStyles.primaryAction} type="submit">
              {t("extra.catalogue.searchButton")}
            </button>
            {filtered ? (
              <Link className={styles.clear} href={basePath}>
                {t("extra.catalogue.clear")}
              </Link>
            ) : null}
          </div>
        </form>
        <p
          className={styles.count}
          role="status"
          aria-live="polite"
          data-testid="catalogue-count"
        >
          {filtered
            ? t("extra.catalogue.countOf", {
                shown: index.shown,
                total: index.total,
              })
            : index.total === 1
              ? t("extra.catalogue.countOne")
              : t("extra.catalogue.countMany", { count: index.total })}
        </p>
        {index.shown === 0 ? (
          <div className={styles.empty} data-testid="catalogue-empty">
            <p>
              <strong>{t("extra.catalogue.none")}</strong>
            </p>
            <p className={styles.hint}>{t("extra.catalogue.noneHint")}</p>
            <Link className={styles.clear} href={basePath}>
              {t("extra.catalogue.clear")}
            </Link>
          </div>
        ) : (
          index.sections.map((result) => {
            const grouped = result.groups.some((group) => group.category);
            const Name = grouped ? "h4" : "h3";
            return (
              <section
                className={styles.section}
                key={result.section.id}
                aria-labelledby={`catalogue-h-${result.section.id}`}
              >
                <h2 id={`catalogue-h-${result.section.id}`} lang={authoredLang}>
                  {result.section.title}
                </h2>
                {result.groups.map((group) => (
                  <div
                    className={styles.group}
                    key={group.category ?? "__other"}
                  >
                    {grouped ? (
                      <h3 lang={group.category ? authoredLang : undefined}>
                        {group.category ?? t("extra.catalogue.other")}
                      </h3>
                    ) : null}
                    <ul className={styles.grid}>
                      {group.entries.map((entry) => {
                        const { price } = splitPriceMeta(entry.meta);
                        const soldOut = entry.availability === "sold_out";
                        const showBadge =
                          entry.availability &&
                          entry.availability !== "available";
                        return (
                          <li
                            className={styles.card}
                            key={entry.id}
                            data-sold-out={soldOut ? "true" : undefined}
                            data-testid="catalogue-card"
                          >
                            {entry.image ? (
                              <ContentPicture
                                image={entry.image}
                                variant="flush"
                                sizes="(max-width: 700px) 100vw, 320px"
                              />
                            ) : null}
                            <div className={styles.cardBody}>
                              <Name>
                                <Link
                                  href={entryPagePath(business.slug, entry.id!)}
                                  lang={
                                    result.section.welsh
                                      ? undefined
                                      : authoredLang
                                  }
                                >
                                  {entry.title}
                                </Link>
                              </Name>
                              {result.type === "team" && entry.meta ? (
                                <p className={styles.meta} lang={authoredLang}>
                                  {entry.meta}
                                </p>
                              ) : null}
                              {result.type !== "team" && price ? (
                                <p className={styles.price} lang={authoredLang}>
                                  {price}
                                </p>
                              ) : null}
                              {showBadge ? (
                                <p
                                  className={`${extraStyles.badge} ${extraStyles[`badge_${entry.availability}`] ?? ""}`}
                                >
                                  {t(
                                    `extra.availability.${entry.availability}` as MessageKey,
                                  )}
                                </p>
                              ) : null}
                              {entry.description ? (
                                <p
                                  className={styles.snippet}
                                  lang={
                                    result.section.welsh
                                      ? undefined
                                      : authoredLang
                                  }
                                >
                                  {entry.description}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </section>
            );
          })
        )}
        {index.truncated ? (
          <p className={styles.note}>
            {t("extra.catalogue.truncated", { count: maxCatalogueItems })}
          </p>
        ) : null}
        <JsonLd
          data={buildCatalogueListJsonLd(
            {
              businessName: business.tradingName,
              path: basePath,
              isDemo: business.isDemo || filtered,
              items: flat.map((entry) => ({
                name: entry.title,
                path: entryPagePath(business.slug, entry.id!),
              })),
            },
            getSiteUrl().origin,
          )}
        />
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
