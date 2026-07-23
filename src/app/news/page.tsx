import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  listWalesOnlineNews,
  WALES_ONLINE_RSS_URL,
} from "@/modules/news/wales-online";
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

function RssIcon() {
  return (
    <svg className={polishStyles.rssIcon} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="5" cy="15" r="1" fill="currentColor" stroke="none" />
      <path d="M4.5 9.5a6 6 0 0 1 6 6M4.5 5a10.5 10.5 0 0 1 10.5 10.5" />
    </svg>
  );
}

function LandscapeArtwork({ item }: { item: WalesOnlineNewsItem | undefined }) {
  if (item?.imageUrl) {
    return (
      <div className={polishStyles.heroMedia} aria-hidden="true">
        <Image
          className={polishStyles.feedImage}
          src={item.imageUrl}
          alt=""
          fill
          priority
          unoptimized
          sizes="(max-width: 70rem) calc(100vw - 2.5rem), 54vw"
          referrerPolicy="no-referrer"
        />
        <span className={polishStyles.imageSource}>Image: WalesOnline RSS</span>
      </div>
    );
  }

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

function StoryMedia({
  item,
  category,
  featured = false,
}: {
  item: WalesOnlineNewsItem;
  category: NewsCategory;
  featured?: boolean;
}) {
  if (!item.imageUrl) {
    return <StoryArtwork category={category} featured={featured} />;
  }

  return (
    <div
      className={`${polishStyles.storyMedia} ${featured ? polishStyles.featuredMedia : ""}`}
      aria-hidden="true"
    >
      <Image
        className={polishStyles.feedImage}
        src={item.imageUrl}
        alt=""
        fill
        unoptimized
        loading={featured ? "eager" : "lazy"}
        sizes={
          featured
            ? "(max-width: 70rem) calc(100vw - 4rem), 54vw"
            : "(max-width: 38rem) 38vw, (max-width: 54rem) 50vw, (max-width: 70rem) 33vw, 25vw"
        }
        referrerPolicy="no-referrer"
      />
      <span className={polishStyles.imageSource}>WalesOnline image</span>
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
  const heroStory = result.items.find((item) => item.imageUrl) ?? featuredStory;
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
        <section className={styles.hero} aria-labelledby="news-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Headlines from an external source</p>
            <h1 id="news-title">Latest news from across Wales.</h1>
            <p className={styles.heroLead}>
              WalesOnline supplies these headlines through its RSS feed.
              OurValleys shows the source, publication time, outbound link and
              any story image explicitly included in the feed; it does not copy
              full articles or present the reporting as its own.
            </p>
            <div className={styles.actions}>
              <a
                className={styles.primaryButton}
                href={WALES_ONLINE_RSS_URL}
                target="_blank"
                rel="noopener noreferrer external"
              >
                <RssIcon />
                Open the WalesOnline RSS feed
              </a>
              <Link className={styles.secondaryButton} href="/businesses">
                Browse local businesses
              </Link>
            </div>
            <p className={styles.sourceLine}>
              Source:{" "}
              <a
                className={polishStyles.sourceLink}
                href="https://www.walesonline.co.uk/news/"
                target="_blank"
                rel="noopener noreferrer external"
              >
                WalesOnline <span aria-hidden="true">↗</span>
              </a>
            </p>
          </div>
          <LandscapeArtwork item={heroStory} />
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
              <article
                className={`${styles.featuredCard} ${polishStyles.featuredCardPolish}`}
              >
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
                    Read the full report, updates and publisher context directly
                    on WalesOnline.
                  </p>
                  <ExternalStoryLink item={featuredStory} />
                </div>
                <StoryMedia
                  item={featuredStory}
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
                    aria-label="Categories represented in the current feed"
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
                      <article
                        className={`${styles.storyCard} ${polishStyles.storyCardPolish}`}
                        key={item.id}
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
                <p className={polishStyles.imageBoundaryNote}>
                  Story images appear only when supplied by the WalesOnline RSS
                  feed. They load from the publisher&apos;s image host and are not
                  stored by OurValleys.
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
