import type { Route } from "next";
import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import type { PlaceMiniMap, ValleyGlance } from "@/lib/place-minimap";
import styles from "./place-minimap.module.css";

type Props = {
  t: Translator;
  lang: string;
  welsh: boolean;
  /** Display name of the page's place. */
  placeName: string;
  /** True when the page is the valley itself. */
  isValley: boolean;
  map: PlaceMiniMap;
  glance: ValleyGlance | null;
};

const LABELLED_DOTS = 5;

function countText(t: Translator, count: number): string {
  if (count === 0) return t("minimap.glanceNone");
  return count === 1
    ? t("minimap.glanceBusinessOne")
    : t("minimap.glanceBusinessMany", { count });
}

function dotLabel(t: Translator, place: string, count: number): string {
  if (count === 0) return t("minimap.dotLabelNone", { place });
  return count === 1
    ? t("minimap.dotLabelOne", { place })
    : t("minimap.dotLabelMany", { place, count });
}

/**
 * The valley a place sits in, as a tile-free picture: a soft outline with the
 * valley's places as dots linking to their own pages. Purely server-rendered,
 * so it works without JavaScript; the list beside it carries the same data.
 */
export function PlaceMiniMap({
  t,
  lang,
  welsh,
  placeName,
  isValley,
  map,
  glance,
}: Props) {
  const valleyName = (welsh && map.valley.welshName) || map.valley.name;
  const name = (entry: { name: string; welshName: string | null }) =>
    (welsh && entry.welshName) || entry.name;
  const labelled = new Set(
    [...map.dots]
      .sort((a, b) => b.businessCount - a.businessCount)
      .slice(0, LABELLED_DOTS)
      .map((dot) => dot.slug),
  );
  const title = isValley
    ? t("minimap.titleValley", { valley: valleyName })
    : t("minimap.title", { place: placeName, valley: valleyName });

  return (
    <section
      className={styles.section}
      aria-labelledby="place-minimap-title"
      lang={lang}
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("minimap.eyebrow")}</p>
          <h2 id="place-minimap-title">{title}</h2>
        </div>
        <p>{t("minimap.note")}</p>
      </div>
      <div
        className={styles.layout}
        style={{ ["--region-hue" as string]: map.hue }}
      >
        <figure className={styles.figure}>
          <svg
            viewBox={`0 0 ${map.width} ${map.height}`}
            role="group"
            aria-label={t("minimap.mapLabel", { valley: valleyName })}
            className={styles.svg}
          >
            <path className={styles.region} d={map.regionPath} />
            {map.dots.map((dot) => {
              const label = name(dot);
              return (
                <Link
                  key={dot.slug}
                  href={`/places/${dot.slug}` as Route}
                  className={styles.dot}
                  data-current={dot.current ? "" : undefined}
                  data-empty={dot.businessCount === 0 ? "" : undefined}
                  aria-label={dotLabel(t, label, dot.businessCount)}
                  aria-current={dot.current ? "page" : undefined}
                >
                  <circle
                    className={styles.hit}
                    cx={dot.x}
                    cy={dot.y}
                    r={Math.max(dot.radius, 9) + 8}
                  />
                  <circle cx={dot.x} cy={dot.y} r={Math.max(dot.radius, 9)} />
                  {dot.current ? (
                    <circle
                      className={styles.ring}
                      cx={dot.x}
                      cy={dot.y}
                      r={Math.max(dot.radius, 9) + 8}
                    />
                  ) : null}
                  {dot.current || labelled.has(dot.slug) ? (
                    <text
                      x={dot.x}
                      y={dot.y - Math.max(dot.radius, 9) - 12}
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  ) : null}
                </Link>
              );
            })}
          </svg>
          <figcaption>
            {isValley ? null : (
              <>
                <span className={styles.legend} aria-hidden="true" />
                {t("minimap.thisPlace")}
                {" · "}
              </>
            )}
            {t("minimap.summary", {
              places: map.placeCount,
              businesses: map.businessCount,
            })}
          </figcaption>
        </figure>
        {glance ? (
          <div className={styles.glance}>
            <h3>{t("minimap.glanceTitle")}</h3>
            <ol className={styles.rows}>
              {glance.rows.map((row) => (
                <li key={row.slug} data-current={row.current ? "" : undefined}>
                  <Link
                    className="text-link"
                    href={`/places/${row.slug}` as Route}
                    aria-current={row.current ? "page" : undefined}
                  >
                    {name(row)}
                  </Link>
                  <span className={styles.count}>
                    {countText(t, row.businessCount)}
                  </span>
                  <span
                    className={styles.bar}
                    aria-hidden="true"
                    style={{ ["--share" as string]: row.share }}
                  />
                </li>
              ))}
            </ol>
            {glance.categories.length > 0 ? (
              <>
                <h3>{t("minimap.categoriesTitle")}</h3>
                <ul className={styles.categories}>
                  {glance.categories.map((category) => (
                    <li key={category.slug}>
                      <Link
                        className="filter-chip"
                        href={
                          `/businesses?place=${map.valley.slug}&category=${category.slug}` as Route
                        }
                      >
                        {(welsh && category.welshLabel) || category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <Link
              className="button"
              href={`/map?valley=${map.valley.slug}` as Route}
            >
              {t("minimap.openMap")}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
