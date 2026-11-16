import type { Metadata, Route } from "next";
import Link from "next/link";
import { BrowseHeader } from "@/components/browse/browse-header";
import browseStyles from "@/components/browse/browse.module.css";
import { OfferCard } from "@/components/browse/offer-card";
import { SortLinks } from "@/components/browse/sort-links";
import { DirectoryCard } from "@/components/directory/directory-card";
import directoryStyles from "@/components/directory/directory.module.css";
import { NearMeButton } from "@/components/directory/near-me-button";
import { EventRow } from "@/components/events/event-row";
import eventStyles from "@/components/events/events.module.css";
import styles from "@/components/nearby/nearby.module.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { pageUrlMetadata } from "@/lib/site";
import { RADIUS_OPTIONS_KM } from "@/modules/businesses/directory-filters";
import { groupEventsByDay } from "@/modules/events/agenda";
import { londonDayKey } from "@/modules/events/date-window";
import { formatDayHeading } from "@/modules/events/format";
import { loadNearby } from "@/modules/nearby/nearby";
import {
  formatKm,
  nearbyHref,
  nearbyListHrefs,
  nearbyRadiusLinks,
  parseNearbyFilters,
  type RawNearbyParams,
} from "@/modules/nearby/nearby-filters";
import { nothingNearby, widerRadius } from "@/modules/nearby/nearby-model";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listPlaceCentroids } from "@/modules/reference-data/place-centroids";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

/** Towns offered as one-press starting points before a place is chosen. */
const STARTING_TOWNS = 12;

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getTranslator();
  const title = t("nearby.metaTitle");
  const description = t("nearby.metaDescription");
  return {
    title,
    description,
    // One page per place and distance: a filter view, kept out of search engines.
    robots: { index: false, follow: false },
    ...pageUrlMetadata("/nearby", {
      title,
      description,
      locale: LOCALE_DETAILS[locale].openGraph,
    }),
  };
}

export default async function NearbyPage({
  searchParams,
}: {
  searchParams: Promise<RawNearbyParams>;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const welsh = locale === "cy";
  const filters = parseNearbyFilters(await searchParams);
  const now = new Date();
  const [result, centroids, categories, rankedPlaces] = await Promise.all([
    loadNearby(filters, { locale, now }),
    listPlaceCentroids(),
    listActiveCategories(),
    listActivePlaces(),
  ]);

  const localName = (place: { name: string; welshName: string | null }) =>
    (welsh && place.welshName) || place.name;
  const towns = centroids
    .map((centroid) => ({ slug: centroid.slug, name: localName(centroid) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang));
  const townNames = Object.fromEntries(
    towns.map((town) => [town.slug, town.name]),
  );
  // Starting points in the order the place pickers use (places the site
  // covers best first), limited to towns a visitor can be standing in.
  const startingTowns = rankedPlaces
    .filter((place) => townNames[place.slug])
    .slice(0, STARTING_TOWNS)
    .map((place) => ({ slug: place.slug, name: townNames[place.slug]! }));
  const categoryNames = new Map(
    categories.map((option) => [
      option.slug,
      (welsh && option.welshLabel) || option.name,
    ]),
  );

  const ready = result.state === "ready" ? result : null;
  const placeName = ready ? localName(ready.origin) : "";
  const radius = filters.radius;
  const hrefs = nearbyListHrefs(filters);
  const counts = ready
    ? {
        openNow: ready.openNow.total,
        businesses: ready.businesses.total,
        events: ready.events.total,
        offers: ready.offers.total,
      }
    : null;
  const empty = counts ? nothingNearby(counts) : false;
  const wider = widerRadius(radius, RADIUS_OPTIONS_KM);
  // Open businesses when any are; otherwise the nearest ones, said plainly.
  const showOpen = ready ? ready.openNow.total > 0 : false;
  const businessSection = ready
    ? showOpen
      ? ready.openNow
      : ready.businesses
    : null;
  const today = londonDayKey(now);
  const agenda = ready ? groupEventsByDay(ready.events.items, now) : [];
  // The origin may be a valley or region, which the town list leaves out.
  const selectOptions =
    ready && !townNames[ready.origin.slug]
      ? [{ slug: ready.origin.slug, name: placeName }, ...towns]
      : towns;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <BrowseHeader
          lang={lang}
          eyebrow={t("nearby.eyebrow")}
          title={
            ready
              ? t("nearby.titlePlace", { place: placeName })
              : t("nearby.title")
          }
          lead={
            ready
              ? t("nearby.leadPlace", { radius, place: placeName })
              : t("nearby.lead")
          }
        >
          {ready ? (
            <Link
              className="button primary"
              href={`/places/${ready.origin.slug}` as Route}
            >
              {t("nearby.aboutPlace", { place: placeName })}
            </Link>
          ) : null}
          <Link className="button" href="/map">
            {t("nearby.onMap")}
          </Link>
        </BrowseHeader>

        <form
          className={`${browseStyles.search} ${styles.chooser} ov-glass`}
          action="/nearby"
          method="get"
          aria-label={t("nearby.formAria")}
          lang={lang}
        >
          <div className="field">
            <label htmlFor="nearby-near">{t("nearby.nearLabel")}</label>
            <select
              // Keyed so a soft navigation ("Near me", a neighbouring town)
              // shows the place now in force rather than the one first rendered.
              key={`near-${ready ? ready.origin.slug : ""}`}
              id="nearby-near"
              name="near"
              defaultValue={ready ? ready.origin.slug : ""}
              required
            >
              <option value="">{t("nearby.choosePlace")}</option>
              {selectOptions.map((town) => (
                <option key={town.slug} value={town.slug}>
                  {town.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="nearby-radius">{t("nearby.withinLabel")}</label>
            <select
              key={`radius-${radius}`}
              id="nearby-radius"
              name="radius"
              defaultValue={String(radius)}
            >
              {RADIUS_OPTIONS_KM.map((option) => (
                <option key={option} value={option}>
                  {t("nearby.km", { radius: option })}
                </option>
              ))}
            </select>
          </div>
          <button
            className={`button primary ${browseStyles.submit}`}
            type="submit"
          >
            {t("nearby.submit")}
          </button>
          <div className={styles.nearMeSlot}>
            <NearMeButton
              scope="nearby"
              filters={filters}
              centroids={centroids}
              displayNames={townNames}
              labels={{
                button: t("dirx.nearMeButton"),
                locating: t("dirx.nearMeLocating"),
                found: t("nearby.nearMeFound", { place: "{place}" }),
                denied: t("nearby.nearMeDenied"),
                unsupported: t("nearby.nearMeUnsupported"),
                timeout: t("nearby.nearMeTimeout"),
                outside: t("nearby.nearMeOutside"),
              }}
            />
            <p className={styles.privacy}>{t("nearby.privacy")}</p>
          </div>
        </form>

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("nearby.unavailableEyebrow")}</p>
            <h2>{t("nearby.unavailableTitle")}</h2>
            <p>{t("nearby.unavailableBody")}</p>
            <div className="actions">
              <Link
                className="button primary"
                href={nearbyHref(filters) as Route}
              >
                {t("nearby.tryAgain")}
              </Link>
              <Link className="button" href="/businesses">
                {t("nearby.browseBusinesses")}
              </Link>
            </div>
          </section>
        ) : null}

        {result.state === "choose" || result.state === "unknown" ? (
          <section
            className="state-panel"
            aria-labelledby="nearby-choose-title"
            lang={lang}
          >
            <p className="eyebrow">
              {result.state === "unknown"
                ? t("nearby.unknownEyebrow")
                : t("nearby.chooseEyebrow")}
            </p>
            <h2 id="nearby-choose-title">
              {result.state === "unknown"
                ? t("nearby.unknownTitle")
                : t("nearby.chooseTitle")}
            </h2>
            <p>
              {result.state === "unknown"
                ? t("nearby.unknownBody")
                : t("nearby.chooseBody")}
            </p>
            {startingTowns.length > 0 ? (
              <nav aria-label={t("nearby.townsAria")}>
                <ul className={styles.towns}>
                  {startingTowns.map((town) => (
                    <li key={town.slug}>
                      <Link
                        className="filter-chip"
                        href={nearbyHref({ near: town.slug }) as Route}
                      >
                        {town.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            <div className="actions">
              <Link className="button" href="/businesses">
                {t("nearby.browseBusinesses")}
              </Link>
            </div>
          </section>
        ) : null}

        {ready && counts ? (
          <>
            <div className={styles.overview} lang={lang}>
              <ul
                className={styles.stats}
                aria-label={t("nearby.summaryAria", {
                  radius,
                  place: placeName,
                })}
              >
                {(
                  [
                    ["openNow", "nearby.statOpenNow", "#nearby-businesses"],
                    [
                      "businesses",
                      "nearby.statBusinesses",
                      "#nearby-businesses",
                    ],
                    ["events", "nearby.statEvents", "#nearby-events"],
                    ["offers", "nearby.statOffers", "#nearby-offers"],
                  ] as const
                ).map(([key, label, anchor]) => (
                  <li key={key}>
                    <a className={`${styles.stat} ov-glass`} href={anchor}>
                      <span className={styles.statValue} data-nearby-stat={key}>
                        {counts[key]}
                      </span>
                      <span className={styles.statLabel}>{t(label)}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <SortLinks
                label={t("nearby.radiusLabel")}
                items={nearbyRadiusLinks(filters).map((link) => ({
                  key: String(link.radius),
                  label: t("nearby.km", { radius: link.radius }),
                  href: link.href,
                  current: link.current,
                }))}
              />
            </div>

            {empty ? (
              <section className="state-panel" aria-live="polite" lang={lang}>
                <p className="eyebrow">{t("nearby.emptyEyebrow")}</p>
                <h2>{t("nearby.emptyTitle", { radius, place: placeName })}</h2>
                <p>{t("nearby.emptyBody")}</p>
                <div className="actions">
                  {wider ? (
                    <Link
                      className="button primary"
                      href={
                        nearbyHref({
                          near: filters.near,
                          radius: wider,
                        }) as Route
                      }
                    >
                      {t("nearby.widen", { radius: wider })}
                    </Link>
                  ) : null}
                  <Link className="button" href="/businesses">
                    {t("nearby.browseBusinesses")}
                  </Link>
                </div>
              </section>
            ) : (
              <>
                <section
                  className={styles.section}
                  id="nearby-businesses"
                  aria-labelledby="nearby-businesses-title"
                >
                  <div className={styles.sectionHead} lang={lang}>
                    <div>
                      <h2 id="nearby-businesses-title">
                        {showOpen || counts.businesses === 0
                          ? t("nearby.openTitle")
                          : t("nearby.closedTitle")}
                      </h2>
                      <p>
                        {counts.businesses === 0
                          ? t("nearby.noBusinesses", {
                              radius,
                              place: placeName,
                            })
                          : showOpen
                            ? t("nearby.openLead")
                            : t("nearby.closedLead")}
                      </p>
                    </div>
                    <div className={styles.sectionLinks}>
                      {showOpen ? (
                        <Link href={hrefs.openNow as Route}>
                          {t("nearby.seeAllOpen", { count: counts.openNow })}
                        </Link>
                      ) : null}
                      {counts.businesses > 0 ? (
                        <Link href={hrefs.businesses as Route}>
                          {t("nearby.seeAllBusinesses", {
                            count: counts.businesses,
                          })}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {businessSection && businessSection.items.length > 0 ? (
                    <div className={directoryStyles.results}>
                      {businessSection.items.map((business) => (
                        <DirectoryCard
                          key={business.id}
                          t={t}
                          business={business}
                          welsh={welsh}
                          categoryName={
                            categoryNames.get(business.category.slug) ??
                            business.category.name
                          }
                          placeName={
                            townNames[business.place.slug] ??
                            business.place.name
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                </section>

                <section
                  className={styles.section}
                  id="nearby-events"
                  aria-labelledby="nearby-events-title"
                >
                  <div className={styles.sectionHead} lang={lang}>
                    <div>
                      <h2 id="nearby-events-title">
                        {t("nearby.eventsTitle")}
                      </h2>
                      <p>
                        {counts.events === 0
                          ? t("nearby.noEvents", { radius, place: placeName })
                          : t("nearby.eventsLead")}
                      </p>
                    </div>
                    <div className={styles.sectionLinks}>
                      {counts.events > 0 ? (
                        <Link href={hrefs.events as Route}>
                          {t("nearby.seeAllEvents", { count: counts.events })}
                        </Link>
                      ) : (
                        <Link href="/events">{t("nearby.allEvents")}</Link>
                      )}
                    </div>
                  </div>
                  {agenda.length > 0 ? (
                    <div className={styles.agenda}>
                      {agenda.map((group) => {
                        const headingId = `nearby-day-${group.dayKey}`;
                        return (
                          <section
                            className={eventStyles.day}
                            key={group.dayKey}
                            aria-labelledby={headingId}
                            lang={lang}
                          >
                            <h3
                              className={eventStyles.dayHeading}
                              id={headingId}
                            >
                              {group.kind === "today"
                                ? t("eventsx.today")
                                : group.kind === "tomorrow"
                                  ? t("eventsx.tomorrow")
                                  : formatDayHeading(group.dayKey, lang, today)}
                            </h3>
                            <ul className={eventStyles.dayList}>
                              {group.events.map(({ event, happeningNow }) => (
                                <li key={event.id}>
                                  <EventRow
                                    t={t}
                                    lang={lang}
                                    event={event}
                                    happeningNow={happeningNow}
                                  />
                                </li>
                              ))}
                            </ul>
                          </section>
                        );
                      })}
                    </div>
                  ) : null}
                </section>

                <section
                  className={styles.section}
                  id="nearby-offers"
                  aria-labelledby="nearby-offers-title"
                >
                  <div className={styles.sectionHead} lang={lang}>
                    <div>
                      <h2 id="nearby-offers-title">
                        {t("nearby.offersTitle")}
                      </h2>
                      <p>
                        {counts.offers === 0
                          ? t("nearby.noOffers", { radius, place: placeName })
                          : t("nearby.offersLead")}
                      </p>
                    </div>
                    <div className={styles.sectionLinks}>
                      {counts.offers > 0 ? (
                        <Link href={hrefs.offers as Route}>
                          {t("nearby.seeAllOffers", { count: counts.offers })}
                        </Link>
                      ) : (
                        <Link href="/offers">{t("nearby.allOffers")}</Link>
                      )}
                    </div>
                  </div>
                  {ready.offers.items.length > 0 ? (
                    <ul className={browseStyles.grid}>
                      {ready.offers.items.map((offer) => (
                        <li key={offer.id}>
                          <OfferCard t={t} offer={offer} now={now} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </>
            )}

            {ready.places.length > 0 ? (
              <section
                className={styles.section}
                aria-labelledby="nearby-places-title"
                lang={lang}
              >
                <div className={styles.sectionHead}>
                  <div>
                    <h2 id="nearby-places-title">{t("nearby.placesTitle")}</h2>
                    <p>{t("nearby.placesLead")}</p>
                  </div>
                </div>
                <ul className={styles.towns}>
                  {ready.places.map((place) => {
                    const name = localName(place);
                    const km = formatKm(place.distanceKm);
                    return (
                      <li key={place.slug}>
                        <Link
                          className="filter-chip"
                          href={
                            nearbyHref({ near: place.slug, radius }) as Route
                          }
                          aria-label={t("nearby.placeAria", { name, km })}
                        >
                          {t("nearby.placeDistance", { name, km })}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
