import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  listWalesOnlineNews,
  WALES_ONLINE_RSS_URL,
} from "@/modules/news/wales-online";

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

function formatPublishedAt(value: Date | null): string {
  return value ? publishedFormatter.format(value) : "Recently published";
}

export default async function NewsPage() {
  const result = await listWalesOnlineNews();

  return (
    <>
      <SiteHeader />
      <main className="businesses-page">
        <section className="businesses-hero" aria-labelledby="news-title">
          <p className="eyebrow">Headlines from an external publisher</p>
          <h1 id="news-title">Latest news from across Wales.</h1>
          <p className="lead">
            WalesOnline supplies these headlines through its RSS feed. OurValleys
            shows the source, publication time and link only; it does not copy
            full articles, images or present this reporting as its own.
          </p>
          <div className="actions">
            <a
              className="button primary"
              href={WALES_ONLINE_RSS_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open the WalesOnline RSS feed
            </a>
            <Link className="button" href="/businesses">
              Browse local businesses
            </Link>
          </div>
        </section>

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">External feed unavailable</p>
            <h2>News headlines cannot be loaded just now.</h2>
            <p>
              WalesOnline remains available directly. OurValleys will try the RSS
              feed again automatically without blocking local business, event or
              guide discovery.
            </p>
            <div className="actions">
              <a
                className="button primary"
                href="https://www.walesonline.co.uk/news/"
                target="_blank"
                rel="noreferrer"
              >
                Visit WalesOnline News
              </a>
              <Link className="button" href="/">
                Return home
              </Link>
            </div>
          </section>
        ) : result.items.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">No feed items</p>
            <h2>No WalesOnline headlines are available in the feed.</h2>
            <p>
              This honest empty state remains until the external publisher adds
              another item or changes the feed.
            </p>
          </section>
        ) : (
          <section
            className="business-results"
            aria-labelledby="news-results-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">From WalesOnline</p>
                <h2 id="news-results-title">
                  {result.items.length} latest headline
                  {result.items.length === 1 ? "" : "s"}
                </h2>
              </div>
              <p>
                Feed checked at {refreshedFormatter.format(result.fetchedAt)}.
                Every article opens on the publisher website.
              </p>
            </div>
            <div className="business-grid">
              {result.items.map((item) => (
                <article className="business-card" key={item.id}>
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">External publisher</span>
                    </div>
                    <p className="eyebrow">
                      {formatPublishedAt(item.publishedAt)}
                    </p>
                    <h3>{item.title}</h3>
                    <p>
                      Headline and timestamp supplied by the WalesOnline RSS feed.
                    </p>
                    <a
                      className="text-link"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read on WalesOnline
                      <span aria-hidden="true"> ↗</span>
                    </a>
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
