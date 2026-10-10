import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { PublisherFeedImage } from "@/components/publisher-feed-image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { listWalesOnlineNews } from "@/modules/news/wales-online";
import type { WalesOnlineNewsItem } from "@/modules/news/rss";
import styles from "./news.module.css";
import polishStyles from "./news-polish.module.css";

export const revalidate = 900;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("news.metaTitle"),
    description: t("news.metaDescription"),
    robots: { index: false, follow: true },
  };
}

function formatters(locale: Locale) {
  const tag = LOCALE_DETAILS[locale].htmlLang;
  return {
    published: new Intl.DateTimeFormat(tag, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/London",
    }),
    refreshed: new Intl.DateTimeFormat(tag, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/London",
    }),
  };
}

type NewsCategory = {
  tone:
    | "news"
    | "traffic"
    | "crime"
    | "weather"
    | "business"
    | "travel"
    | "politics";
};

const fallbackCategory: NewsCategory = { tone: "news" };

function isRollingNewsPlaceholder(item: WalesOnlineNewsItem): boolean {
  return /breaking news plus weather and traffic updates|latest breaking news/i.test(
    item.title,
  );
}

function hasUsableImage(
  item: WalesOnlineNewsItem,
): item is WalesOnlineNewsItem & {
  imageUrl: string;
} {
  return Boolean(item.imageUrl) && !isRollingNewsPlaceholder(item);
}

function formatPublishedAt(
  value: Date | null,
  formatter: Intl.DateTimeFormat,
  t: Translator,
): string {
  return value ? formatter.format(value) : t("news.recentlyPublished");
}

function categoryLabel(tone: NewsCategory["tone"], t: Translator): string {
  return t(`news.category.${tone}`);
}

// Word-boundary matching keeps whole words from triggering on unrelated
// substrings (e.g. "windows" must not read as "wind" → Weather).
function classifyHeadline(title: string): NewsCategory {
  const normalised = title.toLowerCase();

  if (
    /\b(traffic|road|roads|roadworks|motorway|crash|crashes|collision|carriageway|railway|train|trains|car|cars|vehicle|vehicles|driver|drivers|lorry|bus|delays|gridlock)\b|\ba\d{2,4}\b/.test(
      normalised,
    )
  ) {
    return { tone: "traffic" };
  }

  if (
    /\b(police|crime|arrest|arrested|assault|assaulted|attacked|punched|mugged|beaten|robbed|robbery|burglary|mob|abuse|murder|murdered|murdering|killed|kill|shooting|missing|death|died|stabbing|stabbed|charged|court|jailed|sentenced)\b/.test(
      normalised,
    )
  ) {
    return { tone: "crime" };
  }

  if (
    /\b(weather|met office|rain|rains|raining|wind|winds|windy|storm|storms|thunder|thunderstorm|flood|floods|flooding|snow|fog|foggy|heatwave|forecast)\b/.test(
      normalised,
    )
  ) {
    return { tone: "weather" };
  }

  if (
    /\b(business|businesses|energy|building|development|jobs|economy|economic|shop|shops|retail|factory|investment)\b/.test(
      normalised,
    )
  ) {
    return { tone: "business" };
  }

  if (
    /\b(holiday|holidays|travel|travelling|airport|flight|flights|tourist|tourism|hotel|hotels|destination|resort)\b/.test(
      normalised,
    )
  ) {
    return { tone: "travel" };
  }

  if (
    /\b(minister|ministers|government|council|councils|politics|political|senedd|mp|mps|pm|election|elections|parliament)\b/.test(
      normalised,
    )
  ) {
    return { tone: "politics" };
  }

  return fallbackCategory;
}

function CategoryIcon({ tone }: Pick<NewsCategory, "tone">) {
  if (tone === "traffic") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19 10 5h4l5 14M8 13h8M9 9h6" />
      </svg>
    );
  }

  if (tone === "crime") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.6 2.7 8.1 7 10 4.3-1.9 7-5.4 7-10V6l-7-3Z" />
        <path d="M9.5 12.2 11 13.7l3.6-3.8" />
      </svg>
    );
  }

  if (tone === "weather") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 17h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 10.5 3.3 3.3 0 0 0 7 17Z" />
        <path d="m9 20 1-1m3 1 1-1" />
      </svg>
    );
  }

  if (tone === "business") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20V9l8-5 8 5v11M8 20v-7h8v7M3 20h18" />
      </svg>
    );
  }

  if (tone === "travel") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 18h16M6 18l2-8h8l2 8M9 10V6h6v4" />
        <path d="M8 14h8" />
      </svg>
    );
  }

  if (tone === "politics") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9h16M6 9v9m4-9v9m4-9v9m4-9v9M3 20h18M12 3l9 4H3l9-4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5h14v14H5zM8 9h8M8 12h8M8 15h5" />
    </svg>
  );
}

function LandscapeFallback({ embedded = false }: { embedded?: boolean }) {
  return (
    <div
      className={`${styles.landscape} ${embedded ? polishStyles.heroFallback : ""}`}
      aria-hidden="true"
    >
      <span className={styles.landscapeSun} />
      <span className={styles.landscapeRidgeFar} />
      <span className={styles.landscapeRidgeNear} />
      <span className={styles.landscapeTown} />
      <span className={styles.landscapeChurch} />
      <span className={styles.landscapeMist} />
    </div>
  );
}

function ReadAffordance({
  tone = "light",
  t,
}: {
  tone?: "light" | "hero";
  t: Translator;
}) {
  return (
    <span
      className={
        tone === "hero" ? polishStyles.heroCta : polishStyles.storyAffordance
      }
    >
      {t("news.readOn")}
      <span aria-hidden="true">↗</span>
    </span>
  );
}

function FeaturedHero({
  item,
  t,
  dateFormat,
}: {
  item: WalesOnlineNewsItem;
  t: Translator;
  dateFormat: Intl.DateTimeFormat;
}) {
  const category = classifyHeadline(item.title);

  return (
    <a
      className={polishStyles.featuredHero}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer external"
      data-tone={category.tone}
    >
      <div className={polishStyles.featuredHeroMedia} aria-hidden="true">
        <LandscapeFallback embedded />
        {hasUsableImage(item) ? (
          <PublisherFeedImage
            className={polishStyles.feedImage}
            src={item.imageUrl}
            priority
            sizes="(max-width: 70rem) calc(100vw - 2.5rem), 75rem"
          />
        ) : null}
      </div>
      <div className={polishStyles.featuredHeroBody}>
        <div className={polishStyles.featuredHeroMeta}>
          <span className={polishStyles.heroChip}>
            <span className={polishStyles.heroChipIcon}>
              <CategoryIcon tone={category.tone} />
            </span>
            {categoryLabel(category.tone, t)}
          </span>
          <time dateTime={item.publishedAt?.toISOString()}>
            {formatPublishedAt(item.publishedAt, dateFormat, t)}
          </time>
        </div>
        <h2 lang="en-GB">{item.title}</h2>
        <ReadAffordance tone="hero" t={t} />
      </div>
    </a>
  );
}

function StoryArtwork({
  category,
  featured = false,
  t,
}: {
  category: NewsCategory;
  featured?: boolean;
  t: Translator;
}) {
  return (
    <div
      className={`${styles.storyArtwork} ${featured ? styles.storyArtworkFeatured : ""}`}
      data-tone={category.tone}
      aria-hidden="true"
    >
      <span className={styles.storyArtworkGrid} />
      <span className={styles.storyArtworkWatermark}>
        <CategoryIcon tone={category.tone} />
      </span>
      <span className={styles.storyArtworkTag}>
        <span className={styles.storyArtworkTagIcon}>
          <CategoryIcon tone={category.tone} />
        </span>
        {categoryLabel(category.tone, t)}
      </span>
    </div>
  );
}

function StoryMedia({
  item,
  category,
  featured = false,
  t,
}: {
  item: WalesOnlineNewsItem;
  category: NewsCategory;
  featured?: boolean;
  t: Translator;
}) {
  if (!hasUsableImage(item)) {
    return <StoryArtwork category={category} featured={featured} t={t} />;
  }

  return (
    <div
      className={`${polishStyles.storyMedia} ${featured ? polishStyles.featuredMedia : ""}`}
      aria-hidden="true"
    >
      <StoryArtwork category={category} featured={featured} t={t} />
      <PublisherFeedImage
        className={polishStyles.feedImage}
        src={item.imageUrl}
        priority={featured}
        sizes={
          featured
            ? "(max-width: 70rem) calc(100vw - 4rem), 54vw"
            : "(max-width: 38rem) 38vw, (max-width: 54rem) 50vw, (max-width: 70rem) 33vw, 25vw"
        }
      />
    </div>
  );
}

export default async function NewsPage() {
  const [{ locale, t }, result] = await Promise.all([
    getTranslator(),
    listWalesOnlineNews(),
  ]);
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const dateFormats = formatters(locale);
  const featuredStory =
    result.items.find((item) => hasUsableImage(item)) ?? result.items[0];
  const latestStories = featuredStory
    ? result.items.filter((item) => item.id !== featuredStory.id)
    : result.items;
  // Derive the filter chips from the stories actually shown in the grid so
  // every chip matches at least one card (the featured story is excluded).
  const presentCategories: NewsCategory[] = [];
  const seenTones = new Set<NewsCategory["tone"]>();
  for (const item of latestStories) {
    const category = classifyHeadline(item.title);
    if (!seenTones.has(category.tone)) {
      seenTones.add(category.tone);
      presentCategories.push(category);
    }
  }

  return (
    <>
      <SiteHeader />
      <main
        className={`${styles.page} ${polishStyles.pagePolish}`}
        data-testid="news-page"
        lang={lang}
      >
        <section className={polishStyles.masthead} aria-labelledby="news-title">
          <div className={polishStyles.mastheadMain}>
            <p className={polishStyles.mastheadEyebrow}>
              <span className={polishStyles.liveDot} aria-hidden="true" />
              {t("news.eyebrow")}
            </p>
            <h1 id="news-title">{t("news.title")}</h1>
          </div>
          <div className={polishStyles.mastheadAside}>
            <p className={polishStyles.mastheadLead}>
              {t("news.leadBefore")}
              <a
                className={polishStyles.sourceLink}
                href="https://www.walesonline.co.uk/news/"
                target="_blank"
                rel="noopener noreferrer external"
              >
                WalesOnline <span aria-hidden="true">↗</span>
              </a>
              .
            </p>
            <div className={polishStyles.mastheadMeta}>
              <span className={polishStyles.mastheadMetaItem}>
                {t("news.updated", {
                  time: dateFormats.refreshed.format(result.fetchedAt),
                })}
              </span>
              {result.state === "ready" && result.items.length > 0 ? (
                <span className={polishStyles.mastheadMetaItem}>
                  {result.items.length === 1
                    ? t("news.headlineCountOne")
                    : t("news.headlineCountMany", {
                        count: result.items.length,
                      })}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {result.state === "unavailable" ? (
          <section className={styles.statePanel} aria-live="polite">
            <p className={styles.kicker}>{t("news.unavailableKicker")}</p>
            <h2>{t("news.unavailableTitle")}</h2>
            <p>{t("news.unavailableBody")}</p>
            <div className={styles.actions}>
              <a
                className={styles.primaryButton}
                href="https://www.walesonline.co.uk/news/"
                target="_blank"
                rel="noopener noreferrer external"
              >
                {t("news.visitSource")}
              </a>
              <Link className={styles.secondaryButton} href="/">
                {t("news.returnHome")}
              </Link>
            </div>
          </section>
        ) : !featuredStory ? (
          <section className={styles.statePanel} aria-live="polite">
            <p className={styles.kicker}>{t("news.emptyKicker")}</p>
            <h2>{t("news.emptyTitle")}</h2>
            <p>{t("news.emptyBody")}</p>
          </section>
        ) : (
          <>
            <section
              className={polishStyles.featuredSection}
              aria-label={t("news.featuredLabel")}
            >
              <FeaturedHero
                item={featuredStory}
                t={t}
                dateFormat={dateFormats.published}
              />
            </section>

            {latestStories.length > 0 ? (
              <section
                className={`${styles.headlinesSection} ${polishStyles.headlinesSectionPolish}`}
                aria-labelledby="news-results-title"
              >
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.kicker}>{t("news.fromSource")}</p>
                    <h2 id="news-results-title">{t("news.latestHeadlines")}</h2>
                  </div>
                  {presentCategories.length > 1 ? (
                    <div
                      className={polishStyles.filterRow}
                      role="group"
                      aria-label={t("news.filterLabel")}
                    >
                      <input
                        className={polishStyles.filterInput}
                        type="radio"
                        name="news-filter"
                        id="news-filter-all"
                        value="all"
                        defaultChecked
                      />
                      <label
                        className={polishStyles.filterChip}
                        htmlFor="news-filter-all"
                      >
                        {t("news.filterAll")}
                      </label>
                      {presentCategories.map((category) => (
                        <Fragment key={category.tone}>
                          <input
                            className={polishStyles.filterInput}
                            type="radio"
                            name="news-filter"
                            id={`news-filter-${category.tone}`}
                            value={category.tone}
                          />
                          <label
                            className={polishStyles.filterChip}
                            htmlFor={`news-filter-${category.tone}`}
                          >
                            {categoryLabel(category.tone, t)}
                          </label>
                        </Fragment>
                      ))}
                    </div>
                  ) : null}
                </div>

                <input
                  className={polishStyles.moreToggle}
                  id="news-more-toggle"
                  type="checkbox"
                />
                <div
                  className={`${styles.storyGrid} ${polishStyles.storyGridPolish}`}
                >
                  {latestStories.map((item) => {
                    const category = classifyHeadline(item.title);

                    return (
                      <a
                        className={`${styles.storyCard} ${polishStyles.storyCardPolish}`}
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer external"
                        data-category={category.tone}
                      >
                        <StoryMedia item={item} category={category} t={t} />
                        <div className={styles.storyBody}>
                          <div className={styles.storyMeta}>
                            <span className={styles.storyCategory}>
                              {categoryLabel(category.tone, t)}
                            </span>
                            <time dateTime={item.publishedAt?.toISOString()}>
                              {formatPublishedAt(
                                item.publishedAt,
                                dateFormats.published,
                                t,
                              )}
                            </time>
                          </div>
                          <h3 lang="en-GB">{item.title}</h3>
                          <ReadAffordance t={t} />
                        </div>
                      </a>
                    );
                  })}
                </div>
                <label
                  className={polishStyles.moreToggleLabel}
                  htmlFor="news-more-toggle"
                >
                  <span className={polishStyles.showMore}>
                    {t("news.showMore")}
                  </span>
                  <span className={polishStyles.showLess}>
                    {t("news.showFewer")}
                  </span>
                </label>

                <p className={styles.feedStatus}>{t("news.feedStatus")}</p>
              </section>
            ) : null}

            <aside className={styles.businessCallout}>
              <div className={styles.businessCalloutIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 10h16M6 10v9h12v-9M5 10l2-5h10l2 5M9 19v-5h6v5" />
                </svg>
              </div>
              <div>
                <h2>{t("news.calloutTitle")}</h2>
                <p>{t("news.calloutBody")}</p>
              </div>
              <Link className={styles.primaryButton} href="/businesses">
                {t("news.calloutAction")}
              </Link>
            </aside>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
