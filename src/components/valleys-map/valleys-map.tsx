"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { useLocale } from "@/lib/i18n/client";
import type { Translator } from "@/lib/i18n/translate";
import {
  OUTSIDE_AREA_KM,
  bubbleRadius,
  nearestPoints,
  projectPoints,
} from "@/lib/map-projection";
import type { MapPlace } from "@/modules/businesses/map";
import styles from "./valleys-map.module.css";

type LocateState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "denied" }
  | { status: "unsupported" }
  | {
      status: "found";
      outside: boolean;
      nearest: Array<{ slug: string; distanceKm: number }>;
    };

/** No external store: the snapshot differs only between server and client. */
function subscribeNever() {
  return () => {};
}

function countLabel(t: Translator, count: number): string {
  if (count === 0) return t("map.countNone");
  if (count === 1) return t("map.countOne");
  return t("map.countMany", { count });
}

function placeAriaLabel(t: Translator, name: string, count: number): string {
  if (count === 0) return t("map.placeLabelNone", { place: name });
  if (count === 1) return t("map.placeLabelOne", { place: name });
  return t("map.placeLabel", { place: name, count });
}

export function ValleysMap({
  places,
  category,
  initialPlace,
}: {
  places: MapPlace[];
  category: { slug: string; name: string } | null;
  initialPlace: string | null;
}) {
  const { locale, t } = useLocale();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialPlace);
  const [locate, setLocate] = useState<LocateState>({ status: "idle" });
  // The viewBox is fixed, so on a narrow screen everything shrinks with it.
  // `scale` grows radii and type so bubbles and labels stay legible and tappable.
  const [scale, setScale] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  // Until hydration the controls cannot respond, so they stay out of the tab
  // order and the accessibility tree; the table below is the fallback.
  const interactive = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const projection = useMemo(
    () =>
      projectPoints(
        places.map((place) => ({
          key: place.slug,
          latitude: place.latitude,
          longitude: place.longitude,
        })),
        { minGap: 20 * scale, padding: 30 + 18 * scale },
      ),
    [places, scale],
  );
  const positions = useMemo(
    () => new Map(projection.points.map((point) => [point.key, point])),
    [projection],
  );
  const bySlug = useMemo(
    () => new Map(places.map((place) => [place.slug, place])),
    [places],
  );
  // Draw large bubbles first so small ones stay clickable on top of them.
  const drawOrder = useMemo(
    () => [...places].sort((a, b) => b.businessCount - a.businessCount),
    [places],
  );

  useEffect(() => {
    const element = svgRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const width = element.clientWidth;
      if (width > 0) {
        setScale(Math.min(Math.max(projection.width / width, 1), 2.8));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [projection.width]);

  const selected = selectedSlug ? (bySlug.get(selectedSlug) ?? null) : null;
  const nearestSlugs = new Set(
    locate.status === "found" ? locate.nearest.map((item) => item.slug) : [],
  );

  const displayName = (place: MapPlace) =>
    locale === "cy" && place.welshName ? place.welshName : place.name;
  const categoryName = (item: {
    name: string;
    welshLabel: string | null;
  }): string =>
    locale === "cy" && item.welshLabel ? item.welshLabel : item.name;

  const categoryQuery = category
    ? `&category=${encodeURIComponent(category.slug)}`
    : "";

  function choose(slug: string) {
    setSelectedSlug(slug);
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>, slug: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(slug);
    }
  }

  function findMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocate({ status: "unsupported" });
      return;
    }
    setLocate({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Computed here only: the position is never sent anywhere.
        const nearest = nearestPoints(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          places.map((place) => ({
            key: place.slug,
            latitude: place.latitude,
            longitude: place.longitude,
          })),
          3,
        );
        if (nearest.length === 0) {
          setLocate({ status: "denied" });
          return;
        }
        setLocate({
          status: "found",
          outside: nearest[0]!.distanceKm > OUTSIDE_AREA_KM,
          nearest: nearest.map((item) => ({
            slug: item.key,
            distanceKm: item.distanceKm,
          })),
        });
        setSelectedSlug(nearest[0]!.key);
      },
      () => setLocate({ status: "denied" }),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  return (
    <div className={styles.layout}>
      <div className={`${styles.stage} ov-glass`}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`0 0 ${projection.width} ${projection.height}`}
          role="group"
          aria-label={t("map.mapLabel")}
          aria-describedby="valleys-map-hint"
        >
          <defs>
            <pattern
              id="valleys-map-grid"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 80 0 L 0 0 0 80"
                fill="none"
                className={styles.gridLine}
              />
            </pattern>
          </defs>
          <rect
            width={projection.width}
            height={projection.height}
            fill="url(#valleys-map-grid)"
          />
          {drawOrder.map((place, index) => {
            const point = positions.get(place.slug);
            if (!point) return null;
            const radius = bubbleRadius(place.businessCount) * scale;
            const isSelected = place.slug === selectedSlug;
            const isNearest = nearestSlugs.has(place.slug);
            const showLabel =
              place.businessCount > 0 || isSelected || isNearest;
            return (
              <g
                key={place.slug}
                className={styles.place}
                data-selected={isSelected ? "" : undefined}
                data-nearest={isNearest ? "" : undefined}
                data-empty={place.businessCount === 0 ? "" : undefined}
                data-slug={place.slug}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-hidden={interactive ? undefined : true}
                aria-pressed={interactive ? isSelected : undefined}
                aria-label={placeAriaLabel(
                  t,
                  displayName(place),
                  place.businessCount,
                )}
                onClick={() => choose(place.slug)}
                onKeyDown={(event) => onKeyDown(event, place.slug)}
                style={{ animationDelay: `${Math.min(index, 30) * 18}ms` }}
              >
                <circle
                  className={styles.hit}
                  cx={point.x}
                  cy={point.y}
                  r={Math.max(radius, 10 * scale)}
                />
                <circle
                  className={styles.bubble}
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                />
                {place.businessCount > 0 ? (
                  <text
                    className={styles.count}
                    style={{ fontSize: `${14 * scale}px` }}
                    x={point.x}
                    y={point.y}
                    aria-hidden="true"
                  >
                    {place.businessCount}
                  </text>
                ) : null}
                {showLabel ? (
                  <text
                    className={styles.label}
                    style={{ fontSize: `${14 * scale}px` }}
                    x={point.x}
                    y={point.y + radius + 14 * scale}
                    aria-hidden="true"
                  >
                    {displayName(place)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <p id="valleys-map-hint" className={styles.hint}>
          {t("map.mapHint")}
        </p>
      </div>

      <aside className={styles.side} aria-label={t("map.panelTitle")}>
        <section className={`${styles.card} ov-glass`} aria-live="polite">
          <h2 className={styles.cardTitle}>
            {selected ? displayName(selected) : t("map.panelTitle")}
          </h2>
          {selected ? (
            <>
              <p className={styles.countLine}>
                {countLabel(t, selected.businessCount)}
              </p>
              {selected.topCategories.length > 0 ? (
                <>
                  <p className={styles.subhead}>{t("map.topCategories")}</p>
                  <ul className={styles.chips}>
                    {selected.topCategories.map((item) => (
                      <li key={item.slug}>
                        <Link
                          className={styles.chip}
                          href={
                            `/businesses?place=${encodeURIComponent(
                              selected.slug,
                            )}&category=${encodeURIComponent(item.slug)}` as Route
                          }
                        >
                          {categoryName(item)} · {item.count}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className={styles.muted}>{t("map.noneYetHelp")}</p>
              )}
              <div className={styles.actions}>
                <Link
                  className="button primary"
                  href={
                    `/businesses?place=${encodeURIComponent(selected.slug)}${categoryQuery}` as Route
                  }
                >
                  {t("map.browseHere")}
                </Link>
                <Link
                  className="button"
                  href={
                    `/businesses?near=${encodeURIComponent(selected.slug)}&radius=8${categoryQuery}` as Route
                  }
                >
                  {t("map.browseNearby")}
                </Link>
                <Link
                  className="text-link"
                  href={`/places/${encodeURIComponent(selected.slug)}` as Route}
                >
                  {t("map.aboutPlace", { place: displayName(selected) })}
                </Link>
                {selected.businessCount === 0 ? (
                  <Link className="text-link" href="/suggest-a-business">
                    {t("map.suggest")}
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <p className={styles.muted}>{t("map.panelEmptyPrompt")}</p>
          )}
        </section>

        <section className={`${styles.card} ov-glass`}>
          <h2 className={styles.cardTitle}>{t("map.locateTitle")}</h2>
          <button
            type="button"
            className="button"
            onClick={findMe}
            disabled={!interactive || locate.status === "locating"}
          >
            {locate.status === "locating"
              ? t("map.locating")
              : t("map.locateButton")}
          </button>
          <p className={styles.muted}>{t("map.locateNote")}</p>
          <div aria-live="polite">
            {locate.status === "denied" ? (
              <p className={styles.notice}>{t("map.locateDenied")}</p>
            ) : null}
            {locate.status === "unsupported" ? (
              <p className={styles.notice}>{t("map.locateUnsupported")}</p>
            ) : null}
            {locate.status === "found" ? (
              <>
                {locate.outside ? (
                  <p className={styles.notice}>{t("map.locateOutside")}</p>
                ) : null}
                <p className={styles.subhead}>{t("map.nearestHeading")}</p>
                <ol className={styles.nearest}>
                  {locate.nearest.map((item) => {
                    const place = bySlug.get(item.slug);
                    if (!place) return null;
                    return (
                      <li key={item.slug}>
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => choose(item.slug)}
                        >
                          {displayName(place)}
                        </button>
                        <span className={styles.muted}>
                          {" "}
                          {t("map.distanceKm", {
                            distance: item.distanceKm.toFixed(1),
                          })}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : null}
          </div>
        </section>
      </aside>
    </div>
  );
}
