import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  listWalesOnlineNews,
  WALES_ONLINE_RSS_URL,
} from "@/modules/news/wales-online";
import type { WalesOnlineNewsItem } from "@/modules/news/rss";
import styles from "./news.module.css";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Latest Welsh news | OurValleys",
  description:
    "Read attributed Welsh news headlines supplied through the WalesOnline RSS feed.",
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

function formatPublishedAt(value: Date | null): string {
  return value ? publishedFormatter.format(value) : "Recently published";
}

function classifyHeadline(title: string): NewsCategory {
  const normalised = title.toLowerCase();

  if (
    /traffic|road|motorway|a\d{2,4}|crash|carriageway|railway|train/.test(
      normalised,
    )
  ) {
    return { label: "Traffic", tone: "traffic" };
  }

  if (
    /police|crime|arrest|assault|missing|death|body|charged|court/.test(
      normalised,
    )
  ) {
    return { label: "Crime", tone: "crime" };
  }

  if (/weather|rain|wind|storm|flood|heat|snow|warning/.test(normalised)) {
    return { label: "Weather", tone: "weather" };
  }

  if (
    /business|energy|building|development|jobs|economy|shop/.test(normalised)
  ) {
    return { label: "Business", tone: "business" };
  }

  if (
    /holiday|travel|airport|flight|tourist|hotel|destination/.test(normalised)
  ) {
    return { label: "Travel", tone: "travel" };
  }

  if (/minister|government|council|politic|senedd|mp\b|pm\b/.test(normalised)) {
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

function LandscapeArtwork() {
  return (
    <div className={styles.landscape} aria-hidden="true">
      <span className={styles.landscapeSun} />
      <span className={styles.landscapeRidgeFar} />
      <span className={styles.landscapeRidgeNear} />
      <span className={styles.landscapeTown} />
      <span className={styles.landscapeChurch} />
      <span className={styles.landscapeMist} />
    </div>
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

function ExternalStoryLink({ item }: { item: WalesOnlineNewsItem }) {
  return (
    <a
      className={styles.storyLink}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer external"
    >
      Read on WalesOnline
      <span aria-hidden="true">↗</span>
    </a>
  );
}

export default async function NewsPage() {
  const result = await listWalesOnlineNews();
  const [featuredStory, ...latestStories] = result.items;
  const visibleCategories = Array.from(
    new Set(result.items.map((item) => classifyHeadline(item.title).label)),
  ).slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main className={styles.page} data-testid="news-page">
        <section className={styles.hero} aria-labelledby="news-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Headlines from an external source</p>
            <h1 id="news-title">Latest news from across Wales.</h1>
            <p className={styles.heroLead}>
              WalesOnline supplies these headlines through its RSS feed.
              OurValleys shows the source, publication time and link only; it
              does not copy full articles, images or present this reporting as
              its own.
            </p>
            <div className={styles.actions}>
              <a
                className={styles.primaryButton}
                href={WALES_ONLINE_RSS_URL}
                target="_blank"
                rel="noopener noreferrer external"
              >
                <span aria-hidden="true">◔</span>
                Open the WalesOnline RSS feed
              </a>
              <Link className={styles.secondaryButton} href="/businesses">
                Browse local businesses
              </Link>
            </div>
            <p className={styles.sourceLine}>
              Source: WalesOnline <span aria-hidden="true">↗</span>
            </p>
          </div>
          <LandscapeArtwork />
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
              className={styles.featuredSection}
              aria-label="Featured headline"
            >
              <article className={styles.featuredCard}>
                <div className={styles.featuredCopy}>
                  <span className={styles.featuredTag}>Featured story</span>
                  <time
                    className={styles.publishedAt}
                    dateTime={featuredStory.publishedAt?.toISOString()}
                  >
                    {formatPublishedAt(featuredStory.publishedAt)}
                  </time>
                  <h2>{featuredStory.title}</h2>
                  <p>
                    Open the latest report on WalesOnline for the full story,
                    updates and publisher context.
                  </p>
                  <ExternalStoryLink item={featuredStory} />
                </div>
                <StoryArtwork
                  category={classifyHeadline(featuredStory.title)}
                  featured
                />
              </article>
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
                    className={styles.categoryKey}
                    aria-label="Headline categories"
                  >
                    <span className={styles.categoryKeyActive}>All</span>
                    {visibleCategories.map((category) => (
                      <span key={category}>{category}</span>
                    ))}
                  </div>
                </div>

                <div className={styles.storyGrid}>
                  {latestStories.map((item) => {
                    const category = classifyHeadline(item.title);

                    return (
                      <article className={styles.storyCard} key={item.id}>
                        <StoryArtwork category={category} />
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
                          <ExternalStoryLink item={item} />
                        </div>
                      </article>
                    );
                  })}
                </div>

                <p className={styles.feedStatus}>
                  Feed checked at {refreshedFormatter.format(result.fetchedAt)}.
                  Every article opens on the publisher website.
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
