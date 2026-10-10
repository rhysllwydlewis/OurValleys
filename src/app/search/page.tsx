import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { searchSite } from "@/modules/search/site-search";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("search.metaTitle"),
    description: t("search.metaDescription"),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<{ q?: string | string[] }>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatDate(value: Date, htmlLang: string): string {
  return new Intl.DateTimeFormat(htmlLang, {
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
  const { locale, t } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const typed = firstValue(params.q).trim().slice(0, 80);
  const result = await searchSite(typed);
  const encoded = encodeURIComponent(
    result.state === "ready" ? result.query : typed,
  );

  return (
    <>
      <SiteHeader />
      <main className="directory-shell" lang={lang}>
        <section className="directory-intro" aria-labelledby="search-title">
          <p className="eyebrow">{t("search.eyebrow")}</p>
          <h1 id="search-title">{t("search.title")}</h1>
          <p className="lead">{t("search.lead")}</p>
        </section>

        <form
          className="search-panel ov-glass"
          action="/search"
          method="get"
          role="search"
          aria-label={t("search.formLabel")}
        >
          <div className="field">
            <label htmlFor="site-query">{t("search.queryLabel")}</label>
            <input
              id="site-query"
              name="q"
              type="search"
              defaultValue={typed}
              placeholder={t("search.placeholder")}
              maxLength={80}
              autoComplete="off"
              required
              minLength={2}
            />
          </div>
          <button className="button primary" type="submit">
            {t("search.submit")}
          </button>
        </form>

        {result.state === "idle" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">{t("search.idleEyebrow")}</p>
            <h2>{t("search.idleTitle")}</h2>
            <p>{t("search.idleBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("search.browseBusinesses")}
              </Link>
              <Link className="button" href="/events">
                {t("search.browseEvents")}
              </Link>
              <Link className="button" href="/places">
                {t("search.browsePlaces")}
              </Link>
            </div>
          </section>
        ) : result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">{t("search.unavailableEyebrow")}</p>
            <h2>{t("search.unavailableTitle")}</h2>
            <p>{t("search.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("search.browseBusinesses")}
              </Link>
            </div>
          </section>
        ) : result.total === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">{t("search.noneEyebrow")}</p>
            <h2>{t("search.noneTitle", { query: result.query })}</h2>
            <p>{t("search.noneBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("search.browseBusinesses")}
              </Link>
              <Link className="button" href="/places">
                {t("search.browsePlaces")}
              </Link>
            </div>
          </section>
        ) : (
          <div aria-live="polite">
            <p className="lead">
              {result.total === 1
                ? t("search.countOne", { query: result.query })
                : t("search.countMany", {
                    count: result.total,
                    query: result.query,
                  })}
            </p>

            {result.businesses.items.length > 0 ? (
              <section
                className="business-results"
                aria-labelledby="search-businesses-title"
              >
                <div className="section-heading">
                  <h2 id="search-businesses-title">
                    {t("search.businesses", { count: result.businesses.total })}
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
                            <span className="tag">{t("search.demo")}</span>
                          ) : null}
                          <span className="tag tag--quiet">
                            {business.verificationStatus === "verified"
                              ? t("dir.verified")
                              : t("dir.notVerified")}
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
                          {t("search.view", { business: business.tradingName })}
                          <span aria-hidden="true"> →</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                {result.businesses.total > result.businesses.items.length
                  ? moreLink(
                      t("search.seeAllBusinesses", {
                        count: result.businesses.total,
                      }),
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
                    {t("search.events", { count: result.events.total })}
                  </h2>
                </div>
                <div className="business-grid">
                  {result.events.items.map((event) => (
                    <article
                      className="business-card business-card--simple"
                      key={event.id}
                    >
                      <div className="business-card__body">
                        <p className="eyebrow">
                          {formatDate(event.startsAt, lang)}
                        </p>
                        <h3>{event.title}</h3>
                        <p>
                          <Link href={`/b/${event.businessSlug}` as Route}>
                            {t("search.eventBy", {
                              business: event.businessName,
                            })}
                          </Link>
                        </p>
                        {event.locationDisplay ? (
                          <p>{event.locationDisplay}</p>
                        ) : null}
                        <Link
                          className="text-link"
                          href={`/events/${event.id}` as Route}
                        >
                          {t("search.eventView")}
                          <span aria-hidden="true"> →</span>
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
                {result.events.total > result.events.items.length
                  ? moreLink(
                      t("search.seeAllEvents", { count: result.events.total }),
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
                  <h2 id="search-places-title">{t("search.places")}</h2>
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
                  <h2 id="search-categories-title">{t("search.categories")}</h2>
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
                  <h2 id="search-guides-title">{t("search.guides")}</h2>
                </div>
                <div className="business-grid">
                  {result.guides.map((item) => (
                    <article
                      className="business-card business-card--simple"
                      key={item.slug}
                    >
                      <div
                        className="business-card__body"
                        lang={locale === "cy" ? "en-GB" : undefined}
                      >
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
                          {t("search.guideRead")}
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
