import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import directory from "@/components/directory/directory.module.css";
import { RecentSearches } from "@/components/search/recent-searches";
import {
  BestMatch,
  BusinessSection,
  CategorySection,
  EventSection,
  GuideSection,
  NoResults,
  OfferSection,
  PlaceSection,
} from "@/components/search/result-sections";
import { SearchBar } from "@/components/search/search-bar";
import { SearchPagination } from "@/components/search/search-pagination";
import { SearchStartPanel } from "@/components/search/search-start";
import { SearchTabs } from "@/components/search/search-tabs";
import styles from "@/components/search/search.module.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import {
  SEARCH_TYPE_PAGE_SIZE,
  buildSearchTabs,
  parseSearchState,
  searchHref,
} from "@/modules/search/search-filters";
import { loadSearchStart, searchSite } from "@/modules/search/site-search";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("search.metaTitle"),
    description: t("search.metaDescription"),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const state = parseSearchState(await searchParams);
  const { locale, t } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const welsh = locale === "cy";
  const result = await searchSite(state.q, {
    type: state.type,
    page: state.page,
  });

  // A page past the end (a stale link, or a hand-edited address) starts the tab over.
  if (
    result.state === "ready" &&
    result.page > 1 &&
    result.totalPages > 0 &&
    result.page > result.totalPages
  ) {
    redirect(searchHref({ q: result.query, type: result.type }) as Route);
  }

  const start = result.state === "idle" ? await loadSearchStart() : null;
  const sectionProps =
    result.state === "ready" ? { t, result, lang, welsh } : null;
  const typeTotal =
    result.state === "ready" && result.type !== "all"
      ? result.counts[result.type]
      : 0;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell" lang={lang}>
        <section className={directory.header} aria-labelledby="search-title">
          <div>
            <p className="eyebrow">{t("search.eyebrow")}</p>
            <h1 id="search-title">{t("search.title")}</h1>
            <p className="lead">{t("searchx.lead")}</p>
          </div>
        </section>

        <SearchBar t={t} query={state.q} />

        {result.state === "idle" && start ? (
          <SearchStartPanel t={t} start={start} welsh={welsh} />
        ) : result.state === "unavailable" ? (
          <section className="state-panel">
            <p className="eyebrow">{t("search.unavailableEyebrow")}</p>
            <h2>{t("search.unavailableTitle")}</h2>
            <p>{t("search.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("search.browseBusinesses")}
              </Link>
            </div>
          </section>
        ) : sectionProps && result.state === "ready" ? (
          result.total === 0 ? (
            <NoResults {...sectionProps} />
          ) : (
            <div>
              <RecentSearches remember={result.query} />
              <p className={styles.count}>
                {result.total === 1
                  ? t("search.countOne", { query: result.query })
                  : t("search.countMany", {
                      count: result.total,
                      query: result.query,
                    })}
              </p>
              <SearchTabs
                t={t}
                tabs={buildSearchTabs(result.query, result.counts, result.type)}
              />
              <BestMatch {...sectionProps} />
              {result.type === "all" ? (
                <>
                  <BusinessSection {...sectionProps} />
                  <OfferSection {...sectionProps} />
                  <EventSection {...sectionProps} />
                  <PlaceSection {...sectionProps} />
                  <CategorySection {...sectionProps} />
                  <GuideSection {...sectionProps} />
                </>
              ) : (
                <>
                  {result.type === "businesses" ? (
                    <BusinessSection {...sectionProps} />
                  ) : null}
                  {result.type === "offers" ? (
                    <OfferSection {...sectionProps} />
                  ) : null}
                  {result.type === "events" ? (
                    <EventSection {...sectionProps} />
                  ) : null}
                  {result.type === "places" ? (
                    <PlaceSection {...sectionProps} />
                  ) : null}
                  {result.type === "categories" ? (
                    <CategorySection {...sectionProps} />
                  ) : null}
                  {result.type === "guides" ? (
                    <GuideSection {...sectionProps} />
                  ) : null}
                  {typeTotal === 0 ? (
                    <p className={styles.note}>
                      {t("searchx.tabEmpty", { query: result.query })}
                    </p>
                  ) : null}
                  {result.totalPages > 1 ? (
                    <>
                      <p className={styles.count}>
                        {t("searchx.showing", {
                          from: (result.page - 1) * SEARCH_TYPE_PAGE_SIZE + 1,
                          to: Math.min(
                            result.page * SEARCH_TYPE_PAGE_SIZE,
                            typeTotal,
                          ),
                          total: typeTotal,
                        })}
                      </p>
                      <SearchPagination
                        t={t}
                        state={{
                          q: result.query,
                          type: result.type,
                          page: result.page,
                        }}
                        totalPages={result.totalPages}
                      />
                    </>
                  ) : null}
                  <p className={styles.count}>
                    <Link
                      className="text-link"
                      href={searchHref({ q: result.query }) as Route}
                    >
                      {t("searchx.backToAll")}
                    </Link>
                  </p>
                </>
              )}
            </div>
          )
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
