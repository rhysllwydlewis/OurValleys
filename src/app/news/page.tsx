import type { Metadata } from "next";
import Link from "next/link";
import { PublisherFeedImage } from "@/components/publisher-feed-image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listWalesOnlineNews } from "@/modules/news/wales-online";
import type { WalesOnlineNewsItem } from "@/modules/news/rss";
import styles from "./news.module.css";
import polishStyles from "./news-polish.module.css";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Latest Welsh news | OurValleys",
  description:
    "Read attributed Welsh news headlines and feed-supplied story imagery from WalesOnline.",
  robots: { index: false, follow: true },
};

const publishedFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

const refreshedFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

type NewsCategory = {
  label:
    | "News"
    | "Traffic"
    | "Crime"
    | "Weather"
    | "Business"
    | "Travel"
    | "Politics";
  tone:
    | "news"
    | "traffic"
    | "crime"
    | "weather"
    | "business"
    | "travel"
    | "politics";
};

const fallbackCategory: NewsCategory = { label: "News", tone: "news" };

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

function formatPublishedAt(value: Date | null): string {
  return value ? publishedFormatter.format(value) : "Recently published";
}

// Word-boundary matching keeps whole words from triggering on unrelated
// substrings (e.g. "windows" must not read as "wind" → Weather).
function classifyHeadline(title: string): NewsCategory {
  const normalised = title.toLowerCase();

  if (
    /\b(traffic|road|roads|roadworks|motorway|crash|crashes|collision|carriageway|railway|train|trains|delays|gridlock)\b|\ba\d{2,4}\b/.test(
      normalised,
    )
  ) {
    return { label: "Traffic", tone: "traffic" };
  }

  if (
    /\b(police|crime|arrest|arrested|assault|murder|murdered|murdering|missing|death|died|stabbing|stabbed|charged|court|jailed|sentenced)\b/.test(
      normalised,
    )
  ) {
    return { label: "Crime", tone: "crime" };
  }

  if (
    /\b(weather|rain|rains|raining|wind|winds|windy|storm|storms|flood|floods|flooding|snow|heatwave|warning|warnings|forecast)\b/.test(
      normalised,
    )
  ) {
    return { label: "Weather", tone: "weather" };
  }

  if (
    /\b(business|businesses|energy|building|development|jobs|economy|economic|shop|shops|retail|factory|investment)\b/.test(
      normalised,
    )
  ) {
    return { label: "Business", tone: "business" };
  }

  if (
    /\b(holiday|holidays|travel|travelling|airport|flight|flights|tourist|tourism|hotel|hotels|destination|resort)\b/.test(
      normalised,
    )
  ) {
    return { label: "Travel", tone: "travel" };
  }

  if (
    /\b(minister|ministers|government|council|councils|politics|political|senedd|mp|mps|pm|election|elections|parliament)\b/.test(
      normalised,
    )
  ) {
    return { label: "Politics", tone: "politics" };
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

function ReadAffordance({ tone = "light" }: { tone?: "light" | "hero" }) {
  return (
    <span
      className={
        tone === "hero" ? polishStyles.heroCta : polishStyles.storyAffordance
      }
    >
      Read on WalesOnline
      <span aria-hidden="true">↗</span>
    </span>
  );
}

function FeaturedHero({ item }: { item: WalesOnlineNewsItem }) {
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
            {category.label}
          </span>
          <time dateTime={item.publishedAt?.toISOString()}>
            {formatPublishedAt(item.publishedAt)}
          </time>
        </div>
        <h2>{item.title}</h2>
        <ReadAffordance tone="hero" />
      </div>
    </a>
  );
}

function StoryArtwork({
  category,
  featured = false,
}: {
  category: NewsCategory;
  featured?: boolean;
}) {
  return (
    <div
      className={`${styles.storyArtwork} ${featured ? styles.storyArtworkFeatured : ""}`}
      data-tone={category.tone}
      aria-hidden="true"
    >
      <span className={styles.storyArtworkGrid} />
      <span className={styles.storyArtworkArc} />
      <span className={styles.storyArtworkIcon}>
        <CategoryIcon tone={category.tone} />
      </span>
      <span className={styles.storyArtworkLabel}>{category.label}</span>
    </div>
  );
}

function StoryMedia({
  item,
  category,
  featured = false,
}: {
  item: WalesOnlineNewsItem;
  category: NewsCategory;
  featured?: boolean;
}) {
  if (!hasUsableImage(item)) {
    return <StoryArtwork category={category} featured={featured} />;
  }

  return (
    <div
      className={`${polishStyles.storyMedia} ${featured ? polishStyles.featuredMedia : ""}`}
      aria-hidden="true"
    >
      <StoryArtwork category={category} featured={featured} />
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
  const result = await listWalesOnlineNews();
  const featuredStory =
    result.items.find((item) => hasUsableImage(item)) ?? result.items[0];
  const latestStories = featuredStory
    ? result.items.filter((item) => item.id !== featuredStory.id)
    : result.items;
  const visibleCategories = Array.from(
    new Set(result.items.map((item) => classifyHeadline(item.title).label)),
  ).slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main
        className={`${styles.page} ${polishStyles.pagePolish}`}
        data-testid="news-page"
      >
        <section className={polishStyles.masthead} aria-labelledby="news-title">
          <div className={polishStyles.mastheadCopy}>
            <p className={styles.kicker}>Latest news</p>
            <h1 id="news-title">News from across the Valleys and Wales.</h1>
          </div>
          <div className={polishStyles.mastheadAside}>
            <p className={polishStyles.mastheadLead}>
              Headlines gathered from{" "}
              <a
                className={polishStyles.sourceLink}
                href="https://www.walesonline.co.uk/news/"
                target="_blank"
                rel="noopener noreferrer external"
              >
                WalesOnline <span aria-hidden="true">↗</span>
              </a>
              . Every headline opens the original article on their site.
            </p>
          </div>
        </section>

        {result.state === "unavailable" ? (
          <section className={styles.statePanel} aria-live="polite">
            <p className={styles.kicker}>External feed unavailable</p>
            <h2>News headlines cannot be loaded just now.</h2>
            <p>
              WalesOnline remains available directly. OurValleys will try the
              RSS feed again automatically without blocking local business,
              event or guide discovery.
            </p>
            <div className={styles.actions}>
              <a
                className={styles.primaryButton}
                href="https://www.walesonline.co.uk/news/"
                target="_blank"
                rel="noopener noreferrer external"
              >
                Visit WalesOnline News
              </a>
              <Link className={styles.secondaryButton} href="/">
                Return home
              </Link>
            </div>
          </section>
        ) : !featuredStory ? (
          <section className={styles.statePanel} aria-live="polite">
            <p className={styles.kicker}>No feed items</p>
            <h2>No WalesOnline headlines are available in the feed.</h2>
            <p>
              This honest empty state remains until the external publisher adds
              another item or changes the feed.
            </p>
          </section>
        ) : (
          <>
            <section
              className={polishStyles.featuredSection}
              aria-label="Featured headline"
            >
              <FeaturedHero item={featuredStory} />
            </section>

            {latestStories.length > 0 ? (
              <section
                className={styles.headlinesSection}
                aria-labelledby="news-results-title"
              >
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.kicker}>From WalesOnline</p>
                    <h2 id="news-results-title">Latest headlines</h2>
                  </div>
                  <div
                    className={`${styles.categoryKey} ${polishStyles.categoryKeyPolish}`}
                    aria-label="Categories represented in the current feed"
                  >
                    <span className={styles.categoryKeyActive}>All</span>
                    {visibleCategories.map((category) => (
                      <span key={category}>{category}</span>
                    ))}
                  </div>
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
                      >
                        <StoryMedia item={item} category={category} />
                        <div className={styles.storyBody}>
                          <div className={styles.storyMeta}>
                            <span className={styles.storyCategory}>
                              {category.label}
                            </span>
                            <time dateTime={item.publishedAt?.toISOString()}>
                              {formatPublishedAt(item.publishedAt)}
                            </time>
                          </div>
                          <h3>{item.title}</h3>
                          <ReadAffordance />
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
                    View more headlines
                  </span>
                  <span className={polishStyles.showLess}>
                    Show fewer headlines
                  </span>
                </label>

                <p className={styles.feedStatus}>
                  Updated {refreshedFormatter.format(result.fetchedAt)} ·
                  Headlines and images via WalesOnline, linked to the original
                  articles.
                </p>
              </section>
            ) : null}

            <aside className={styles.businessCallout}>
              <div className={styles.businessCalloutIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M4 10h16M6 10v9h12v-9M5 10l2-5h10l2 5M9 19v-5h6v5" />
                </svg>
              </div>
              <div>
                <h2>Discover local businesses in your area</h2>
                <p>
                  Search trusted businesses across the Valleys and support
                  local.
                </p>
              </div>
              <Link className={styles.primaryButton} href="/businesses">
                Browse businesses
              </Link>
            </aside>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
