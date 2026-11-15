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
 * The valley a place sits in: the piece of the valleys map around it, with
 * the valley's river and its places as markers linking to their own pages.
 * Purely server-rendered, so it works without JavaScript; the list beside it
 * carries the same data.
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
  const { view, unit } = map;
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
            viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
            role="group"
            aria-label={t("minimap.mapLabel", { valley: valleyName })}
            className={styles.svg}
          >
            <g aria-hidden="true">
              <rect
                className={styles.sea}
                x={view.x}
                y={view.y}
                width={view.width}
                height={view.height}
              />
              <image
                href={map.relief.href}
                x={0}
                y={0}
                width={map.relief.width}
                height={map.relief.height}
                preserveAspectRatio="none"
              />
              {map.otherRivers.map((path, index) => (
                <path key={index} className={styles.otherRiver} d={path} />
              ))}
              {map.river ? (
                <>
                  <path className={styles.riverGlow} d={map.river} />
                  <path className={styles.river} d={map.river} />
                </>
              ) : null}
            </g>
            {map.dots.map((dot) => {
              const label = name(dot);
              const at = welsh ? dot.welshLabel : dot.label;
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
                    r={Math.max(dot.hit, dot.radius)}
                  />
                  {dot.current ? (
                    <circle
                      className={styles.ring}
                      cx={dot.x}
                      cy={dot.y}
                      r={dot.radius + 5 * unit}
                      style={{ strokeWidth: 2.5 * unit }}
                    />
                  ) : null}
                  <circle
                    className={styles.marker}
                    cx={dot.x}
                    cy={dot.y}
                    r={dot.radius}
                    style={{
                      strokeWidth: (dot.businessCount > 0 ? 2.5 : 1.8) * unit,
                    }}
                  />
                  {dot.businessCount > 0 ? (
                    <text
                      className={styles.number}
                      x={dot.x}
                      y={dot.y}
                      style={{ fontSize: `${12 * unit}px` }}
                      aria-hidden="true"
                    >
                      {dot.businessCount}
                    </text>
                  ) : null}
                  {at ? (
                    <text
                      className={styles.name}
                      x={at.x}
                      y={at.y}
                      textAnchor={at.anchor}
                      style={{ fontSize: `${13 * unit}px` }}
                      aria-hidden="true"
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
