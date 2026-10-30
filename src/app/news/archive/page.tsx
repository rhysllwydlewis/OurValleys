import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StoryCards } from "@/components/stories/story-cards";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicPageRobots } from "@/lib/release-stage";
import { pageUrlMetadata } from "@/lib/site";
import {
  groupStoriesByYear,
  parseStoryArchiveQuery,
} from "@/modules/stories/model";
import {
  listStoryArchivePage,
  listStoryPlaceOptions,
} from "@/modules/stories/public";
import styles from "./archive.module.css";

export const dynamic = "force-dynamic";

type RawParams = { page?: string | string[]; place?: string | string[] };

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getTranslator();
  const title = t("stories.archiveMetaTitle");
  const description = t("stories.archiveMetaDescription");
  return {
    title,
    description,
    robots: getPublicPageRobots(),
    ...pageUrlMetadata("/news/archive", {
      title,
      description,
      locale: LOCALE_DETAILS[locale].openGraph,
      types: { "application/atom+xml": "/news/feed.xml" },
    }),
  };
}

function archiveHref(placeSlug: string | null, page: number): Route {
  const params = new URLSearchParams();
  if (placeSlug) params.set("place", placeSlug);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `/news/archive?${query}` : "/news/archive") as Route;
}

export default async function StoryArchivePage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const { t, locale } = await getTranslator();
  const query = parseStoryArchiveQuery(await searchParams);
  const [archive, placeOptions] = await Promise.all([
    listStoryArchivePage(locale, query),
    listStoryPlaceOptions(),
  ]);
  const activePlace =
    placeOptions.find((option) => option.slug === query.placeSlug) ?? null;
  const placeSlug = activePlace?.slug ?? null;
  const totalPages = archive
    ? Math.max(1, Math.ceil(archive.total / archive.pageSize))
    : 1;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <div className={styles.page}>
          <header className={`${styles.header} ov-glass`}>
            <p className={styles.eyebrow}>{t("stories.eyebrow")}</p>
            <h1>{t("stories.archiveTitle")}</h1>
            <p>{t("stories.archiveIntro")}</p>
            <div className={styles.links}>
              <Link className="text-link" href="/news">
                {t("stories.allNews")}
              </Link>
              <a className="text-link" href="/news/feed.xml">
                {t("stories.feedLink")}
              </a>
            </div>
          </header>

          {placeOptions.length > 1 ? (
            <nav aria-label={t("stories.filterLabel")}>
              <ul className={styles.filters}>
                <li>
                  <Link
                    href={archiveHref(null, 1)}
                    aria-current={placeSlug === null ? "true" : undefined}
                  >
                    {t("stories.filterAll")}
                  </Link>
                </li>
                {placeOptions.map((option) => (
                  <li key={option.slug}>
                    <Link
                      href={archiveHref(option.slug, 1)}
                      aria-current={
                        placeSlug === option.slug ? "true" : undefined
                      }
                    >
                      {option.name} ({option.count})
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {archive === null ? (
            <section className={`${styles.state} ov-glass`} role="status">
              <h2>{t("stories.archiveUnavailableTitle")}</h2>
              <p>{t("stories.archiveUnavailableBody")}</p>
            </section>
          ) : archive.stories.length === 0 ? (
            <section className={`${styles.state} ov-glass`}>
              <h2>{t("stories.archiveEmptyTitle")}</h2>
              <p>{t("stories.archiveEmptyBody")}</p>
            </section>
          ) : (
            <>
              {groupStoriesByYear(archive.stories).map((group) => (
                <section
                  key={group.year}
                  className={styles.year}
                  aria-labelledby={`year-${group.year}`}
                >
                  <h2 id={`year-${group.year}`}>{group.year}</h2>
                  <StoryCards stories={group.stories} t={t} locale={locale} />
                </section>
              ))}
              {totalPages > 1 ? (
                <nav
                  className={styles.pager}
                  aria-label={t("stories.pagerLabel")}
                >
                  {archive.page > 1 ? (
                    <Link
                      className="button"
                      rel="prev"
                      href={archiveHref(placeSlug, archive.page - 1)}
                    >
                      {t("stories.pagerPrevious")}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <p>
                    {t("stories.pagerStatus", {
                      page: archive.page,
                      pages: totalPages,
                    })}
                  </p>
                  {archive.page < totalPages ? (
                    <Link
                      className="button"
                      rel="next"
                      href={archiveHref(placeSlug, archive.page + 1)}
                    >
                      {t("stories.pagerNext")}
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
