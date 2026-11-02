import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  PlaceAreaRail,
  PlaceAreaSection,
  PlaceFilterChips,
  PlaceSearchBar,
  PlaceTile,
} from "@/components/places/place-directory";
import { PlaceStats } from "@/components/places/place-stats";
import headerStyles from "@/components/directory/directory.module.css";
import styles from "@/components/places/places.module.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { loadPlaceTree } from "@/modules/reference-data/place-directory";
import {
  ancestorsOf,
  displayName,
  isLocality,
  parsePlaceDirectoryFilters,
  placeDirectoryHref,
  councilAreasOf,
  viewPlaceDirectory,
} from "@/modules/reference-data/place-tree";
import { pageUrlMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getTranslator();
  const title = t("places.metaTitle");
  const description = t("places.metaDescription");
  return {
    title,
    description,
    robots: { index: false, follow: false },
    ...pageUrlMetadata("/places", {
      title,
      description,
      locale: LOCALE_DETAILS[locale].openGraph,
    }),
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const welsh = locale === "cy";
  const filters = parsePlaceDirectoryFilters(await searchParams);
  const tree = await loadPlaceTree();

  if (!tree || tree.nodes.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className={`directory-shell ${styles.page}`}>
          <section
            className="directory-intro"
            aria-labelledby="places-title"
            lang={lang}
          >
            <p className="eyebrow">{t("places.eyebrow")}</p>
            <h1 id="places-title">{t("places.title")}</h1>
          </section>
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("places.unavailableEyebrow")}</p>
            <h2>{t("places.unavailableTitle")}</h2>
            <p>{t("places.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("places.searchAll")}
              </Link>
              <Link className="button" href="/">
                {t("places.returnHome")}
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const areas = councilAreasOf(tree);
  const view = viewPlaceDirectory(tree, filters);
  const localities = tree.nodes.filter(isLocality);
  const stats = [
    ...(areas.length > 0
      ? [{ label: t("placesx.statAreas"), value: areas.length }]
      : []),
    { label: t("placesx.statPlaces"), value: localities.length },
    {
      label: t("placesx.statActive"),
      value: localities.filter(
        (node) => (tree.totalCount.get(node.id) ?? 0) > 0,
      ).length,
    },
    {
      label: t("placesx.statBusinesses"),
      value: tree.nodes.reduce((sum, node) => sum + node.businessCount, 0),
    },
  ];
  const scopedArea = filters.area ? tree.bySlug.get(filters.area) : undefined;
  const validArea =
    scopedArea && areas.some((area) => area.id === scopedArea.id)
      ? scopedArea
      : undefined;
  const effectiveFilters = { ...filters, area: validArea?.slug ?? "" };
  const filtered = Boolean(
    effectiveFilters.q || effectiveFilters.area || effectiveFilters.active,
  );
  const count = view.matches ? view.matches.length : view.visiblePlaces;

  return (
    <>
      <SiteHeader />
      <main className={`directory-shell ${styles.page}`}>
        <section
          className={headerStyles.header}
          aria-labelledby="places-title"
          lang={lang}
        >
          <div>
            <p className="eyebrow">{t("places.eyebrow")}</p>
            <h1 id="places-title">{t("places.title")}</h1>
            <p className="lead">{t("placesx.lead")}</p>
          </div>
          <Link className="button" href="/map">
            {t("placesx.mapLink")}
          </Link>
        </section>

        <PlaceStats label={t("placesx.statsAria")} items={stats} />

        <PlaceSearchBar
          t={t}
          filters={effectiveFilters}
          areas={areas}
          welsh={welsh}
        />
        <PlaceAreaRail
          t={t}
          filters={effectiveFilters}
          areas={areas}
          welsh={welsh}
        />
        <PlaceFilterChips
          t={t}
          filters={effectiveFilters}
          areaName={validArea ? displayName(validArea, welsh) : null}
        />

        <div className={styles.resultsBar} lang={lang}>
          <h2 aria-live="polite">
            {count === 1
              ? t("placesx.resultsOne")
              : t("placesx.resultsMany", { count })}
          </h2>
        </div>

        {count === 0 ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <h2>{t("placesx.noMatchesTitle")}</h2>
            <p>{t("placesx.noMatchesBody")}</p>
            <Link
              className="button primary"
              href={placeDirectoryHref({}) as Route}
            >
              {t("placesx.noMatchesAction")}
            </Link>
          </section>
        ) : view.matches ? (
          <ul className={styles.tiles}>
            {view.matches.map((node) => (
              <PlaceTile
                key={node.id}
                t={t}
                node={node}
                count={tree.totalCount.get(node.id) ?? 0}
                welsh={welsh}
                context={ancestorsOf(tree, node.id)
                  .map((ancestor) => displayName(ancestor, welsh))
                  .join(" · ")}
              />
            ))}
          </ul>
        ) : (
          view.areas.map((entry) => (
            <PlaceAreaSection
              key={entry.area.id}
              t={t}
              tree={tree}
              entry={entry}
              welsh={welsh}
              expanded={filtered || entry.businessCount > 0}
            />
          ))
        )}

        {view.otherPlaces.length > 0 ? (
          <section aria-labelledby="places-other-title" lang={lang}>
            {view.areas.length > 0 || view.matches ? (
              <h2 className={styles.areaTitle} id="places-other-title">
                {t("placesx.unplaced")}
              </h2>
            ) : (
              <h2 className="sr-only" id="places-other-title">
                {t("placesx.unplaced")}
              </h2>
            )}
            <ul className={styles.tiles}>
              {view.otherPlaces.map((node) => (
                <PlaceTile
                  key={node.id}
                  t={t}
                  node={node}
                  count={tree.totalCount.get(node.id) ?? 0}
                  welsh={welsh}
                />
              ))}
            </ul>
          </section>
        ) : null}

        <p className={styles.note} lang={lang}>
          {t("placesx.growingNote")} {t("places.demoNote")}.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
