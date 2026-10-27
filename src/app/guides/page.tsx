import type { Metadata, Route } from "next";
import Link from "next/link";
import { BrowseHeader } from "@/components/browse/browse-header";
import styles from "@/components/browse/browse.module.css";
import { PillRail, type PillRailItem } from "@/components/browse/pill-rail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { foldText } from "@/modules/search/match";
import { getPublicPageRobots } from "@/lib/release-stage";
import {
  filterGuides,
  guideAreaCounts,
  guidesHref,
  hasGuideFilters,
  parseGuideFilters,
  type RawGuideParams,
} from "@/modules/guides/guide-filters";
import { listPublicGuides, type PublicGuide } from "@/modules/guides/public";
import { guideContentLang } from "@/modules/guides/welsh";
import { pageUrlMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getTranslator();
  const title = t("guides.metaTitle");
  const description = t("guides.metaDescription");
  return {
    title,
    description,
    robots: getPublicPageRobots(),
    ...pageUrlMetadata("/guides", {
      title,
      description,
      locale: LOCALE_DETAILS[locale].openGraph,
    }),
  };
}

function GuideCard({ t, guide }: { t: Translator; guide: PublicGuide }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardBody}>
        <div className="tag-row">
          <span className="tag" lang={guideContentLang(guide.contentLocale)}>
            {guide.area}
          </span>
          {guide.sponsorshipDisclosure ? (
            <span className="tag tag--quiet">{t("guidesx.sponsoredNote")}</span>
          ) : null}
        </div>
        <h3
          className={styles.cardTitle}
          lang={guideContentLang(guide.contentLocale)}
        >
          <Link href={`/guides/${guide.slug}` as Route}>{guide.title}</Link>
        </h3>
        <p className={styles.copy} lang={guideContentLang(guide.contentLocale)}>
          {guide.summary}
        </p>
        <p className={styles.meta}>
          <span lang={guideContentLang(guide.contentLocale)}>
            {guide.readingTime}
          </span>{" "}
          · {t("guidesx.by", { author: guide.authorName })}
        </p>
      </div>
    </article>
  );
}

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<RawGuideParams>;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const filters = parseGuideFilters(await searchParams);
  const result = await listPublicGuides(locale);
  const all = result.state === "ready" ? result.guides : [];
  const guides = filterGuides(all, filters);
  const filtered = hasGuideFilters(filters);
  const areas = guideAreaCounts(all);
  // The newest guide leads the page, but only on the unfiltered view.
  const featured = !filtered && guides.length >= 3 ? guides[0] : undefined;
  const rest = featured ? guides.slice(1) : guides;

  const railItems: PillRailItem[] =
    areas.length > 1
      ? [
          {
            key: "all",
            label: t("guidesx.allAreas"),
            count: all.length,
            href: guidesHref(filters, { area: "" }),
            current: !filters.area,
          },
          ...areas.map((entry) => ({
            key: entry.area,
            label: entry.area,
            count: entry.count,
            href: guidesHref(filters, { area: entry.area }),
            current: foldText(entry.area) === foldText(filters.area),
            ariaLabel: t("guidesx.pillAria", {
              name: entry.area,
              count: entry.count,
            }),
          })),
        ]
      : [];

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <BrowseHeader
          lang={lang}
          eyebrow={t("guides.eyebrow")}
          title={t("guides.title")}
          lead={t("guidesx.lead")}
        >
          <Link className="button primary" href="/businesses">
            {t("guides.searchBusinesses")}
          </Link>
          <Link className="button" href="/events">
            {t("guides.browseEvents")}
          </Link>
        </BrowseHeader>

        {result.state === "unavailable" ? (
          <div className="state-panel" aria-live="polite" lang={lang}>
            <p>{t("guides.unavailable")}</p>
          </div>
        ) : all.length === 0 ? (
          <div className="state-panel" lang={lang}>
            <p>{t("guides.empty")}</p>
          </div>
        ) : (
          <>
            <form
              className={`${styles.search} ${styles.searchTwo} ov-glass`}
              action="/guides"
              method="get"
              role="search"
              aria-label={t("guides.eyebrow")}
              lang={lang}
            >
              <div className="field">
                <label htmlFor="guide-query">{t("guidesx.searchLabel")}</label>
                <input
                  id="guide-query"
                  name="q"
                  type="search"
                  defaultValue={filters.q}
                  placeholder={t("guidesx.searchPlaceholder")}
                  maxLength={80}
                  autoComplete="off"
                />
              </div>
              {filters.area ? (
                <input type="hidden" name="area" value={filters.area} />
              ) : null}
              <button
                className={`button primary ${styles.submit}`}
                type="submit"
              >
                {t("guidesx.searchSubmit")}
              </button>
            </form>

            <div lang={lang}>
              <PillRail label={t("guidesx.areasAria")} items={railItems} />
            </div>

            {guides.length === 0 ? (
              <div className="state-panel" aria-live="polite" lang={lang}>
                <h2>{t("guidesx.emptyFiltered")}</h2>
                <p>{t("guidesx.emptyFilteredBody")}</p>
                <div className="actions">
                  <Link className="button primary" href={"/guides" as Route}>
                    {t("guidesx.clear")}
                  </Link>
                  <Link className="button" href="/search">
                    {t("guides.searchEverything")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {featured ? (
                  <section
                    className={`${styles.featured} ov-glass`}
                    aria-labelledby="featured-guide-title"
                  >
                    <div lang={lang}>
                      <p className="eyebrow">{t("guidesx.featured")}</p>
                      <h2
                        id="featured-guide-title"
                        lang={guideContentLang(featured.contentLocale)}
                      >
                        <Link
                          href={`/guides/${featured.slug}` as Route}
                          className="text-link"
                        >
                          {featured.title}
                        </Link>
                      </h2>
                      <p
                        className={styles.copy}
                        lang={guideContentLang(featured.contentLocale)}
                      >
                        {featured.summary}
                      </p>
                    </div>
                    <div className={styles.featuredSide} lang={lang}>
                      <span
                        className="tag"
                        lang={guideContentLang(featured.contentLocale)}
                      >
                        {featured.area}
                      </span>
                      {featured.sponsorshipDisclosure ? (
                        <span className="tag tag--quiet">
                          {t("guidesx.sponsoredNote")}
                        </span>
                      ) : null}
                      <p className={styles.meta}>
                        <span lang={guideContentLang(featured.contentLocale)}>
                          {featured.readingTime}
                        </span>{" "}
                        · {t("guidesx.by", { author: featured.authorName })}
                      </p>
                      <Link
                        className="button primary"
                        href={`/guides/${featured.slug}` as Route}
                      >
                        {t("guides.read")}
                      </Link>
                    </div>
                  </section>
                ) : null}

                <section aria-labelledby="guide-list-title">
                  <div className={styles.toolbar} lang={lang}>
                    <div>
                      <h2 id="guide-list-title">
                        {filtered
                          ? t("guidesx.showing", {
                              shown: guides.length,
                              total: all.length,
                            })
                          : featured
                            ? t("guidesx.more")
                            : all.length === 1
                              ? t("guides.listOne")
                              : t("guides.listMany", { count: all.length })}
                      </h2>
                      <p className={styles.range}>{t("guides.noPaid")}</p>
                    </div>
                  </div>
                  {rest.length > 0 ? (
                    <ul className={styles.grid}>
                      {rest.map((guide) => (
                        <li key={guide.slug}>
                          <GuideCard t={t} guide={guide} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </>
            )}
          </>
        )}

        <section
          className="state-panel"
          aria-labelledby="guide-safety-title"
          lang={lang}
        >
          <p className="eyebrow">{t("guides.cantFindEyebrow")}</p>
          <h2 id="guide-safety-title">{t("guides.cantFindTitle")}</h2>
          <p>{t("guides.cantFindBody")}</p>
          <div className="actions">
            <Link className="button primary" href="/search">
              {t("guides.searchEverything")}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
