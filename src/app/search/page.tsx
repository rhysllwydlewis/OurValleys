import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { searchSite } from "@/modules/search/site-search";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search OurValleys",
  description:
    "Search local businesses, events, places, categories and guides across the South Wales Valleys in one place.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ q?: string | string[] }>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function moreLink(label: string, href: string) {
  return (
    <p>
      <Link className="text-link" href={href as Route}>
        {label}
        <span aria-hidden="true"> →</span>
      </Link>
    </p>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const typed = firstValue(params.q).trim().slice(0, 80);
  const result = await searchSite(typed);
  const encoded = encodeURIComponent(
    result.state === "ready" ? result.query : typed,
  );

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="search-title">
          <p className="eyebrow">Search</p>
          <h1 id="search-title">Find anything local, in one search.</h1>
          <p className="lead">
            Businesses, events, places, categories and guides from across the
            Valleys. Only published, public information is searched.
          </p>
        </section>

        <form
          className="search-panel ov-glass"
          action="/search"
          method="get"
          role="search"
          aria-label="Search OurValleys"
        >
          <div className="field">
            <label htmlFor="site-query">What are you looking for?</label>
            <input
              id="site-query"
              name="q"
              type="search"
              defaultValue={typed}
              placeholder="A café, a class, a town…"
              maxLength={80}
              autoComplete="off"
              required
              minLength={2}
            />
          </div>
          <button className="button primary" type="submit">
            Search
          </button>
        </form>

        {result.state === "idle" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Start typing</p>
            <h2>Enter at least two characters.</h2>
            <p>
              Or browse a section directly: businesses, events, places or
              guides.
            </p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                Browse businesses
              </Link>
              <Link className="button" href="/events">
                Browse events
              </Link>
              <Link className="button" href="/places">
                Browse places
              </Link>
            </div>
          </section>
        ) : result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporarily unavailable</p>
            <h2>Search is not available right now.</h2>
            <p>Please try again shortly, or browse the directory instead.</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                Browse businesses
              </Link>
            </div>
          </section>
        ) : result.total === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">No results</p>
            <h2>Nothing matched &ldquo;{result.query}&rdquo;.</h2>
            <p>
              Check the spelling, try a shorter word, or browse by category or
              place.
            </p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                Browse businesses
              </Link>
              <Link className="button" href="/places">
                Browse places
              </Link>
            </div>
          </section>
        ) : (
          <div aria-live="polite">
            <p className="lead">
              {result.total === 1 ? "1 result" : `${result.total} results`} for
              &ldquo;{result.query}&rdquo;
            </p>

            {result.businesses.items.length > 0 ? (
              <section
                className="business-results"
                aria-labelledby="search-businesses-title"
              >
                <div className="section-heading">
                  <h2 id="search-businesses-title">
                    Businesses ({result.businesses.total})
                  </h2>
                </div>
                <div className="business-grid">
                  {result.businesses.items.map((business) => (
                    <article
                      className="business-card business-card--simple"
                      key={business.id}
                    >
                      <div className="business-card__body">
                        <div className="tag-row">
                          {business.isDemo ? (
                            <span className="tag">Fictional demonstration</span>
                          ) : null}
                          <span className="tag tag--quiet">
                            {business.verificationStatus === "verified"
                              ? "Verified"
                              : "Not verified"}
                          </span>
                        </div>
                        <h3>{business.tradingName}</h3>
                        <p>{business.summary}</p>
                        <p>
                          {business.category.name} · {business.place.name}
                        </p>
                        <Link
                          className="text-link"
                          href={`/b/${business.slug}` as Route}
                        >
                          View {business.tradingName}
                          <span aria-hidden="true"> →</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                {result.businesses.total > result.businesses.items.length
                  ? moreLink(
                      `See all ${result.businesses.total} businesses`,
                      `/businesses?q=${encoded}`,
                    )
                  : null}
              </section>
            ) : null}

            {result.events.items.length > 0 ? (
              <section
                className="business-results"
                aria-labelledby="search-events-title"
              >
                <div className="section-heading">
                  <h2 id="search-events-title">
                    Events ({result.events.total})
                  </h2>
                </div>
                <div className="business-grid">
                  {result.events.items.map((event) => (
                    <article
                      className="business-card business-card--simple"
                      key={event.id}
                    >
                      <div className="business-card__body">
                        <p className="eyebrow">{formatDate(event.startsAt)}</p>
                        <h3>{event.title}</h3>
                        <p>
                          By{" "}
                          <Link href={`/b/${event.businessSlug}` as Route}>
                            {event.businessName}
                          </Link>
                        </p>
                        {event.locationDisplay ? (
                          <p>{event.locationDisplay}</p>
                        ) : null}
                        <Link
                          className="text-link"
                          href={`/events/${event.id}` as Route}
                        >
                          View details
                          <span aria-hidden="true"> →</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                {result.events.total > result.events.items.length
                  ? moreLink(
                      `See all ${result.events.total} events`,
                      `/events?q=${encoded}`,
                    )
                  : null}
              </section>
            ) : null}

            {result.places.length > 0 ? (
              <section
                className="business-results"
                aria-labelledby="search-places-title"
              >
                <div className="section-heading">
                  <h2 id="search-places-title">Places</h2>
                </div>
                <ul className="tag-row">
                  {result.places.map((item) => (
                    <li key={item.slug}>
                      <Link
                        className="filter-chip"
                        href={
                          `/places/${encodeURIComponent(item.slug)}` as Route
                        }
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.categories.length > 0 ? (
              <section
                className="business-results"
                aria-labelledby="search-categories-title"
              >
                <div className="section-heading">
                  <h2 id="search-categories-title">Categories</h2>
                </div>
                <ul className="tag-row">
                  {result.categories.map((item) => (
                    <li key={item.slug}>
                      <Link
                        className="filter-chip"
                        href={
                          `/businesses?category=${encodeURIComponent(item.slug)}` as Route
                        }
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.guides.length > 0 ? (
              <section
                className="business-results"
                aria-labelledby="search-guides-title"
              >
                <div className="section-heading">
                  <h2 id="search-guides-title">Guides</h2>
                </div>
                <div className="business-grid">
                  {result.guides.map((item) => (
                    <article
                      className="business-card business-card--simple"
                      key={item.slug}
                    >
                      <div className="business-card__body">
                        <div className="tag-row">
                          <span className="tag">{item.area}</span>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.summary}</p>
                        <p>{item.readingTime}</p>
                        <Link
                          className="text-link"
                          href={`/guides/${item.slug}` as Route}
                        >
                          Read the guide
                          <span aria-hidden="true"> →</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
