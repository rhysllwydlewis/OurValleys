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
import { pageUrlMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getTranslator();
  const title = t("map.metaTitle");
  const description = t("map.metaDescription");
  return {
    title,
    description,
    robots: getPublicPageRobots(),
    ...pageUrlMetadata("/map", {
      title,
      description,
      locale: LOCALE_DETAILS[locale].openGraph,
    }),
  };
}

type SearchParams = Promise<{
  category?: string | string[];
  place?: string | string[];
  valley?: string | string[];
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
  const requestedValley = firstValue(params.valley).trim().toLowerCase();
  const initialValley = map.valleys.some(
    (valley) => valley.slug === requestedValley,
  )
    ? requestedValley
    : null;
  const selectedCategory = map.selectedCategory;

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
  // Places with businesses, grouped under their valley (busiest valley first).
  const groups = [
    ...[...map.valleys]
      .sort(
        (a, b) =>
          b.businessCount - a.businessCount ||
          a.name.localeCompare(b.name, "en"),
      )
      .map((valley) => ({
        key: valley.slug,
        valley,
        places: withBusinesses.filter(
          (place) => place.valleySlug === valley.slug,
        ),
      })),
    {
      key: "other",
      valley: null,
      places: withBusinesses.filter(
        (place) =>
          !place.valleySlug ||
          !map.valleys.some((valley) => valley.slug === place.valleySlug),
      ),
    },
  ].filter((group) => group.places.length > 0);
  const valleyHref = (slug: string) =>
    `/map?valley=${encodeURIComponent(slug)}${
      selectedCategory
        ? `&category=${encodeURIComponent(selectedCategory.slug)}`
        : ""
    }` as Route;
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
            {(selectedCategory &&
            !map.categories.some((item) => item.slug === selectedCategory.slug)
              ? [...map.categories, selectedCategory]
              : map.categories
            ).map((item) => (
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
          valleys={map.valleys}
          category={
            selectedCategory
              ? {
                  slug: selectedCategory.slug,
                  name: categoryLabel(selectedCategory),
                }
              : null
          }
          initialPlace={initialPlace}
          initialValley={initialValley}
        />

        <section
          className={styles.listSection}
          aria-labelledby="map-list-title"
        >
          <h2 id="map-list-title">{t("map.listTitle")}</h2>
          <p className="body-copy">{t("map.listIntro")}</p>
          {groups.map((group) => (
            <section
              key={group.key}
              className={styles.group}
              aria-labelledby={`map-group-${group.key}`}
            >
              <h3 id={`map-group-${group.key}`} className={styles.groupTitle}>
                {group.valley ? (
                  <Link
                    className="text-link"
                    href={valleyHref(group.valley.slug)}
                  >
                    {placeName(group.valley)}
                  </Link>
                ) : (
                  t("map.listOther")
                )}
              </h3>
              {group.valley ? (
                <p className={styles.groupIntro}>
                  {t("map.valleyCounts", {
                    places: group.valley.placeCount,
                    count: group.valley.businessCount,
                  })}
                </p>
              ) : null}
              <PlaceTable
                places={group.places}
                caption={
                  group.valley ? placeName(group.valley) : t("map.listOther")
                }
                placeHeading={t("map.listPlace")}
                countHeading={t("map.listBusinesses")}
                hrefFor={(place) => browseHref(place.slug)}
                nameFor={placeName}
              />
            </section>
          ))}
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
