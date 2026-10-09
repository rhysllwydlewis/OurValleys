import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ValleysMap } from "@/components/valleys-map/valleys-map";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicPageRobots } from "@/lib/release-stage";
import { getValleysMap, type MapPlace } from "@/modules/businesses/map";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("map.metaTitle"),
    description: t("map.metaDescription"),
    robots: getPublicPageRobots(),
  };
}

type SearchParams = Promise<{
  category?: string | string[];
  place?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function PlaceTable({
  places,
  caption,
  placeHeading,
  countHeading,
  hrefFor,
  nameFor,
}: {
  places: MapPlace[];
  caption: string;
  placeHeading: string;
  countHeading: string;
  hrefFor: (place: MapPlace) => Route;
  nameFor: (place: MapPlace) => string;
}) {
  return (
    <table className={styles.table}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{placeHeading}</th>
          <th scope="col" className={styles.number}>
            {countHeading}
          </th>
        </tr>
      </thead>
      <tbody>
        {places.map((place) => (
          <tr key={place.slug}>
            <th scope="row">
              <Link className="text-link" href={hrefFor(place)}>
                {nameFor(place)}
              </Link>
            </th>
            <td className={styles.number}>{place.businessCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { locale, t } = await getTranslator();
  const map = await getValleysMap({ category: firstValue(params.category) });
  const lang = LOCALE_DETAILS[locale].htmlLang;

  if (map.state === "unavailable") {
    return (
      <>
        <SiteHeader />
        <main className="directory-shell" lang={lang}>
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">{t("map.eyebrow")}</p>
            <h1>{t("map.unavailableTitle")}</h1>
            <p>{t("map.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("map.browseDirectory")}
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const placeName = (place: { name: string; welshName: string | null }) =>
    locale === "cy" && place.welshName ? place.welshName : place.name;
  const categoryLabel = (item: { name: string; welshLabel: string | null }) =>
    locale === "cy" && item.welshLabel ? item.welshLabel : item.name;

  const requestedPlace = firstValue(params.place).trim().toLowerCase();
  const initialPlace = map.places.some((place) => place.slug === requestedPlace)
    ? requestedPlace
    : null;
  const selectedCategory = map.selectedCategory
    ? (map.categories.find((item) => item.slug === map.selectedCategory) ??
      null)
    : null;

  const summary =
    map.totalBusinesses === 0
      ? t("map.summaryNone", { places: map.places.length })
      : map.totalBusinesses === 1
        ? t("map.summaryOne", { places: map.places.length })
        : t("map.summary", {
            places: map.places.length,
            count: map.totalBusinesses,
          });

  const listed = [...map.places].sort(
    (a, b) =>
      b.businessCount - a.businessCount || a.name.localeCompare(b.name, "en"),
  );
  const withBusinesses = listed.filter((place) => place.businessCount > 0);
  const withoutBusinesses = listed.filter((place) => place.businessCount === 0);
  const browseHref = (slug: string) =>
    `/businesses?place=${encodeURIComponent(slug)}${
      selectedCategory
        ? `&category=${encodeURIComponent(selectedCategory.slug)}`
        : ""
    }` as Route;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell" lang={lang}>
        <section className={styles.intro} aria-labelledby="map-title">
          <p className="eyebrow">{t("map.eyebrow")}</p>
          <h1 id="map-title">{t("map.title")}</h1>
          <p className="lead">{t("map.lead")}</p>
        </section>

        {map.categories.length > 0 ? (
          <nav
            className={`filter-row ${styles.filters}`}
            aria-label={t("map.categoryNav")}
          >
            <span className="filter-row__label">{t("map.filterLabel")}</span>
            <Link
              className="filter-chip"
              href="/map"
              aria-current={selectedCategory ? undefined : "true"}
            >
              {t("map.filterAll")}
            </Link>
            {map.categories.slice(0, 12).map((item) => (
              <Link
                className="filter-chip"
                key={item.slug}
                href={`/map?category=${encodeURIComponent(item.slug)}` as Route}
                aria-current={
                  selectedCategory?.slug === item.slug ? "true" : undefined
                }
              >
                {categoryLabel(item)} ({item.count})
              </Link>
            ))}
          </nav>
        ) : null}

        <p className={styles.summary} role="status">
          {summary}
        </p>

        <noscript>
          <p className="state-panel">{t("map.noscript")}</p>
        </noscript>
        <ValleysMap
          places={map.places}
          category={
            selectedCategory
              ? {
                  slug: selectedCategory.slug,
                  name: categoryLabel(selectedCategory),
                }
              : null
          }
          initialPlace={initialPlace}
        />

        <section
          className={styles.listSection}
          aria-labelledby="map-list-title"
        >
          <h2 id="map-list-title">{t("map.listTitle")}</h2>
          <p className="body-copy">{t("map.listIntro")}</p>
          {withBusinesses.length > 0 ? (
            <PlaceTable
              places={withBusinesses}
              caption={t("map.listTitle")}
              placeHeading={t("map.listPlace")}
              countHeading={t("map.listBusinesses")}
              hrefFor={(place) => browseHref(place.slug)}
              nameFor={placeName}
            />
          ) : null}
          {withoutBusinesses.length > 0 ? (
            <details className={styles.empty}>
              <summary>
                {t("map.listEmptySummary", { count: withoutBusinesses.length })}
              </summary>
              <PlaceTable
                places={withoutBusinesses}
                caption={t("map.listEmptySummary", {
                  count: withoutBusinesses.length,
                })}
                placeHeading={t("map.listPlace")}
                countHeading={t("map.listBusinesses")}
                hrefFor={(place) =>
                  `/places/${encodeURIComponent(place.slug)}` as Route
                }
                nameFor={placeName}
              />
            </details>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
