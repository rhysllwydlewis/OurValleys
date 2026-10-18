import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRatingTag } from "@/components/business-rating-tag";
import headerStyles from "@/components/directory/directory.module.css";
import {
  PlaceTile,
  businessCountLabel,
} from "@/components/places/place-directory";
import { PlaceStats } from "@/components/places/place-stats";
import styles from "@/components/places/places.module.css";
import { JsonLd } from "@/components/json-ld";
import { SavedPlaceControl } from "@/components/saved-place-control";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { businessCardArtStyle } from "@/lib/business-card-art";
import { getInitials } from "@/lib/initials";
import { getSiteUrl } from "@/lib/site";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { getPublicPageRobots } from "@/lib/release-stage";
import {
  listCategoriesWithPublishedBusinesses,
  listPublishedBusinesses,
} from "@/modules/businesses/public";
import {
  daysUntilOfferEnds,
  listPublicOffers,
} from "@/modules/businesses/public-offers";
import { listPublicEvents } from "@/modules/events/public";
import { listPublicGuidesForPlace } from "@/modules/guides/public";
import { loadPlaceTree } from "@/modules/reference-data/place-directory";
import {
  ancestorsOf,
  descendantsOf,
  displayName,
} from "@/modules/reference-data/place-tree";
import {
  getPlaceBySlug,
  listNearbyPlaces,
} from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

const COVERAGE_STATUSES = ["planned", "seeding", "pilot", "active"] as const;

function coverageLabel(status: string, t: Translator): string {
  return (COVERAGE_STATUSES as readonly string[]).includes(status)
    ? t(`place.coverage.${status as (typeof COVERAGE_STATUSES)[number]}`)
    : status;
}

const KM_TO_MILES = 0.621371;

function offerEndsLabel(endsAt: Date | null, now: Date, t: Translator): string {
  const days = daysUntilOfferEnds(endsAt, now);
  if (days === null) return t("offers.noEnd");
  if (days === 0) return t("offers.endsToday");
  return days === 1
    ? t("offers.endsTomorrow")
    : t("offers.endsInDays", { days });
}

function formatEventDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getTranslator();
  const selectedPlace = await getPlaceBySlug(slug);

  return {
    title: selectedPlace
      ? t("place.metaTitle", { name: selectedPlace.name })
      : t("place.notFoundTitle"),
    description: selectedPlace
      ? selectedPlace.editorialSummary
      : t("place.notFoundDescription"),
    robots: getPublicPageRobots(),
  };
}

export default async function PlacePage({ params }: PageProps) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const selectedPlace = await getPlaceBySlug(slug);
  if (!selectedPlace) notFound();

  const now = new Date();
  const [
    result,
    offersResult,
    eventsResult,
    guidesResult,
    nearbyPlaces,
    tree,
    categoryRows,
  ] = await Promise.all([
    listPublishedBusinesses({ place: selectedPlace.slug }),
    listPublicOffers({ place: selectedPlace.slug, page: 1, locale }),
    listPublicEvents({ place: selectedPlace.slug, page: 1, locale }),
    listPublicGuidesForPlace(selectedPlace.id),
    listNearbyPlaces(selectedPlace.id),
    loadPlaceTree(),
    listCategoriesWithPublishedBusinesses({
      placeSlug: selectedPlace.slug,
      limit: 12,
    }),
  ]);

  const welsh = locale === "cy";
  const placeNode = tree?.bySlug.get(selectedPlace.slug);
  const trail = tree && placeNode ? ancestorsOf(tree, placeNode.id) : [];
  const inside =
    tree && placeNode ? (tree.childrenOf.get(placeNode.id) ?? []) : [];
  const insideCount =
    tree && placeNode ? descendantsOf(tree, placeNode.id).length : 0;
  const businessTotal = result.state === "ready" ? result.total : 0;
  const offerTotal = offersResult.state === "ready" ? offersResult.total : 0;
  const eventTotal = eventsResult.state === "ready" ? eventsResult.total : 0;
  const categories = categoryRows.map((row) => ({
    slug: row.slug,
    name: (welsh && row.welshLabel) || row.name,
    count: row.count,
  }));

  return (
    <>
      <SiteHeader />
      <main className={`directory-shell ${styles.page}`}>
        <JsonLd
          data={buildBreadcrumbJsonLd(
            [
              { name: t("breadcrumb.home"), path: "/" },
              { name: t("breadcrumb.places"), path: "/places" },
              {
                name: selectedPlace.name,
                path: `/places/${selectedPlace.slug}`,
              },
            ],
            getSiteUrl().origin,
          )}
        />
        {trail.length > 0 ? (
          <nav
            className={styles.crumbs}
            aria-label={t("placex.breadcrumbAria")}
          >
            <ol>
              <li>
                <Link className="text-link" href="/places">
                  {t("breadcrumb.places")}
                </Link>
              </li>
              {trail.map((ancestor) => (
                <li key={ancestor.id}>
                  <Link
                    className="text-link"
                    href={`/places/${ancestor.slug}` as Route}
                  >
                    {displayName(ancestor, welsh)}
                  </Link>
                </li>
              ))}
              <li aria-current="page">
                {placeNode ? displayName(placeNode, welsh) : selectedPlace.name}
              </li>
            </ol>
          </nav>
        ) : null}
        <section className={headerStyles.header} aria-labelledby="place-title">
          <div>
            <p className="eyebrow" lang={lang}>
              {t("place.eyebrow")}
            </p>
            <h1 id="place-title">{selectedPlace.name}</h1>
            {selectedPlace.welshName &&
            selectedPlace.welshName !== selectedPlace.name ? (
              <p className="body-copy" lang="cy">
                {selectedPlace.welshName}
              </p>
            ) : null}
            <p className="lead">{selectedPlace.editorialSummary}</p>
            <div className="tag-row">
              <span className="tag tag--quiet" lang={lang}>
                {coverageLabel(selectedPlace.coverageStatus, t)}
              </span>
            </div>
          </div>
          <div className="actions">
            <Link
              className="button primary"
              href={`/businesses?place=${selectedPlace.slug}` as Route}
            >
              <span lang={lang}>
                {t("place.searchIn", { name: selectedPlace.name })}
              </span>
            </Link>
            <Link className="button" href={`/map?place=${selectedPlace.slug}`}>
              <span lang={lang}>{t("placex.mapLink")}</span>
            </Link>
            <Link className="button" href="/places">
              <span lang={lang}>{t("place.browseAll")}</span>
            </Link>
          </div>
        </section>

        <PlaceStats
          label={t("placex.statsAria", { name: selectedPlace.name })}
          items={[
            { label: t("placex.statBusinesses"), value: businessTotal },
            { label: t("placex.statOffers"), value: offerTotal },
            { label: t("placex.statEvents"), value: eventTotal },
            ...(insideCount > 0
              ? [{ label: t("placex.statPlaces"), value: insideCount }]
              : []),
          ]}
        />

        {inside.length > 0 && tree ? (
          <section aria-labelledby="place-within-title">
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("placex.withinEyebrow")}</p>
                <h2 id="place-within-title">
                  {t("placex.withinTitle", { name: selectedPlace.name })}
                </h2>
              </div>
              <p>{t("placex.withinNote")}</p>
            </div>
            <ul className={styles.tiles}>
              {inside.map((child) => (
                <PlaceTile
                  key={child.id}
                  t={t}
                  node={child}
                  count={tree.totalCount.get(child.id) ?? 0}
                  welsh={welsh}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {categories.length > 0 ? (
          <section aria-labelledby="place-categories-title">
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("place.categoriesEyebrow")}</p>
                <h2 id="place-categories-title">
                  {t("place.categoriesTitle")}
                </h2>
              </div>
            </div>
            <div className="filter-row">
              {categories.map((entry) => (
                <Link
                  className="filter-chip"
                  key={entry.slug}
                  href={
                    `/businesses?place=${selectedPlace.slug}&category=${entry.slug}` as Route
                  }
                >
                  {entry.name} ({entry.count})
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("place.unavailableEyebrow")}</p>
            <h2>{t("place.unavailableTitle")}</h2>
            <p>{t("place.unavailableBody")}</p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("place.emptyEyebrow")}</p>
            <h2>{t("place.emptyTitle")}</h2>
            <p>{t("placex.emptyAreaBody", { name: selectedPlace.name })}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("place.exploreAll")}
              </Link>
              <Link className="button" href="/suggest-a-business">
                {t("placex.suggest")}
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="place-results-title">
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("place.resultsEyebrow")}</p>
                <h2 id="place-results-title">
                  {result.total === 1
                    ? t("place.countOne")
                    : t("place.countMany", { count: result.total })}
                </h2>
              </div>
              <p>
                {t("place.organic")}
                {insideCount > 0
                  ? ` ${t("placex.includesNote", { name: selectedPlace.name })}`
                  : ""}
              </p>
            </div>
            <div className="business-grid">
              {result.businesses.map((business) => (
                <article className="business-card" key={business.id}>
                  <div
                    className="business-card__art"
                    aria-hidden="true"
                    style={businessCardArtStyle(business.cardImage)}
                  >
                    {business.cardImage ? null : (
                      <span className="business-card__initials">
                        {getInitials(business.tradingName)}
                      </span>
                    )}
                    <span>{business.category.name}</span>
                  </div>
                  <div className="business-card__body">
                    <div className="tag-row">
                      {business.isDemo ? (
                        <span className="tag" lang={lang}>
                          {t("place.fictionalDemo")}
                        </span>
                      ) : null}
                      <BusinessRatingTag rating={business.rating} />
                    </div>
                    {insideCount > 0 ? (
                      <p className={styles.sectionTag} lang={lang}>
                        {t("placex.inPlace", { name: business.place.name })}
                      </p>
                    ) : null}
                    <h3>{business.tradingName}</h3>
                    {business.welshName &&
                    business.welshName !== business.tradingName ? (
                      <p className="body-copy" lang="cy">
                        {business.welshName}
                      </p>
                    ) : null}
                    <p>{business.summary}</p>
                    <Link
                      className="text-link"
                      href={`/b/${business.slug}` as Route}
                    >
                      {t("place.viewSite")}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {result.total > result.businesses.length ? (
              <p>
                <Link
                  className="text-link"
                  href={`/businesses?place=${selectedPlace.slug}` as Route}
                >
                  {t("place.searchIn", { name: selectedPlace.name })}
                  <span aria-hidden="true"> →</span>
                </Link>
              </p>
            ) : null}
          </section>
        )}

        {eventsResult.state === "ready" && eventsResult.events.length > 0 ? (
          <section aria-labelledby="place-events-title">
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("place.eventsEyebrow")}</p>
                <h2 id="place-events-title">
                  {t("place.eventsTitle", { name: selectedPlace.name })}
                </h2>
              </div>
              <Link
                className="text-link"
                href={`/events?place=${selectedPlace.slug}` as Route}
              >
                {t("place.viewAllEvents")}
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
            <div className="business-grid">
              {eventsResult.events.slice(0, 4).map((event) => (
                <article
                  className="business-card business-card--simple"
                  key={event.id}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag" lang={lang}>
                        {event.fictional
                          ? t("place.fictionalDemo")
                          : t("place.localEvent")}
                      </span>
                    </div>
                    <p className="eyebrow">
                      {formatEventDate(event.startsAt, locale)}
                    </p>
                    <h3 lang={event.welshTitle ? "cy-GB" : undefined}>
                      {event.title}
                    </h3>
                    <p>{t("place.by", { name: event.businessName })}</p>
                    <Link
                      className="text-link"
                      href={`/events/${event.id}` as Route}
                    >
                      {t("place.viewEvent")}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {offersResult.state === "ready" && offersResult.offers.length > 0 ? (
          <section aria-labelledby="place-offers-title">
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("place.offersEyebrow")}</p>
                <h2 id="place-offers-title">
                  {t("place.offersTitle", { name: selectedPlace.name })}
                </h2>
              </div>
              <Link
                className="text-link"
                href={`/offers?place=${selectedPlace.slug}` as Route}
              >
                {t("place.viewAllOffers")}
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
            <div className="business-grid">
              {offersResult.offers.slice(0, 4).map((offer) => (
                <article
                  className="business-card business-card--simple"
                  key={offer.id}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag" lang={lang}>
                        {offer.fictional
                          ? t("place.fictionalDemo")
                          : t("place.localOffer")}
                      </span>
                    </div>
                    <p className="eyebrow">
                      {offerEndsLabel(offer.endsAt, now, t)}
                    </p>
                    <h3 lang={offer.welshTitle ? "cy-GB" : undefined}>
                      {offer.title}
                    </h3>
                    <p>
                      <Link href={`/b/${offer.businessSlug}` as Route}>
                        {t("place.from", { name: offer.businessName })}
                      </Link>
                    </p>
                    <Link
                      className="text-link"
                      href={`/b/${offer.businessSlug}#offers` as Route}
                    >
                      {t("place.viewOffer")}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {guidesResult.state === "ready" && guidesResult.guides.length > 0 ? (
          <section aria-labelledby="place-guides-title">
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("place.guidesEyebrow")}</p>
                <h2 id="place-guides-title">
                  {t("place.guidesTitle", { name: selectedPlace.name })}
                </h2>
              </div>
              <Link className="text-link" href="/guides">
                {t("place.browseGuides")}
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
            <div className="business-grid">
              {guidesResult.guides.map((guide) => (
                <article
                  className="business-card business-card--simple"
                  key={guide.slug}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">{guide.readingTime}</span>
                    </div>
                    <h3>{guide.title}</h3>
                    <p>{guide.summary}</p>
                    <Link
                      className="text-link"
                      href={`/guides/${guide.slug}` as Route}
                    >
                      {t("place.readGuide")}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {nearbyPlaces.length > 0 ? (
          <section aria-labelledby="place-nearby-title">
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("place.nearbyEyebrow")}</p>
                <h2 id="place-nearby-title">{t("place.nearbyTitle")}</h2>
              </div>
            </div>
            <div className="filter-row">
              {nearbyPlaces.map((nearby) => (
                <Link
                  className="filter-chip"
                  key={nearby.slug}
                  href={`/places/${nearby.slug}` as Route}
                >
                  {t("place.miles", {
                    name: nearby.name,
                    distance: (nearby.distanceKm * KM_TO_MILES).toFixed(1),
                  })}
                  {tree?.bySlug.get(nearby.slug) ? (
                    <>
                      {" · "}
                      {businessCountLabel(
                        t,
                        tree.totalCount.get(tree.bySlug.get(nearby.slug)!.id) ??
                          0,
                      )}
                    </>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <SavedPlaceControl
          placeId={selectedPlace.id}
          returnTo={`/places/${selectedPlace.slug}`}
        />
      </main>
      <SiteFooter />
    </>
  );
}
