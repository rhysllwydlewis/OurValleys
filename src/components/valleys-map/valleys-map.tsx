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
import { suggestBusinessHref } from "@/lib/suggest-business-href";
import type { Translator } from "@/lib/i18n/translate";
import {
  OUTSIDE_AREA_KM,
  bubbleRadius,
  focusViewBox,
  nearestPoints,
  projectPoints,
  regionHue,
  regionShape,
} from "@/lib/map-projection";
import type { MapPlace, MapValley } from "@/modules/businesses/map";
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

function isNarrowScreen(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 40rem)").matches
  );
}

function subscribeNarrow(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia("(max-width: 40rem)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

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
  valleys,
  category,
  initialPlace,
  initialValley,
}: {
  places: MapPlace[];
  valleys: MapValley[];
  category: { slug: string; name: string } | null;
  initialPlace: string | null;
  initialValley: string | null;
}) {
  const { locale, t } = useLocale();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialPlace);
  // The valley picker is a long list; on a phone it starts folded away.
  const narrow = useSyncExternalStore(
    subscribeNarrow,
    isNarrowScreen,
    () => false,
  );
  const [pickerChoice, setPickerChoice] = useState<boolean | null>(null);
  const pickerOpen = pickerChoice ?? !narrow;
  const [valleySlug, setValleySlug] = useState<string | null>(initialValley);
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
  const valleyBySlug = useMemo(
    () => new Map(valleys.map((valley) => [valley.slug, valley])),
    [valleys],
  );
  // One soft outline per valley, from where its places actually sit.
  const regions = useMemo(() => {
    const padding = 26 + 14 * scale;
    return valleys.flatMap((valley) => {
      const shape = regionShape(
        places
          .filter((place) => place.valleySlug === valley.slug)
          .flatMap((place) => {
            const point = positions.get(place.slug);
            return point ? [point] : [];
          }),
        padding,
      );
      return shape ? [{ valley, shape, hue: regionHue(valley.slug) }] : [];
    });
  }, [valleys, places, positions, scale]);
  const focused = valleySlug
    ? (regions.find((region) => region.valley.slug === valleySlug) ?? null)
    : null;
  const viewBox = useMemo(
    () =>
      focused
        ? focusViewBox(focused.shape.bounds, projection)
        : { x: 0, y: 0, width: projection.width, height: projection.height },
    [focused, projection],
  );
  // Bubbles and type keep their on-screen size when the map is focused.
  const drawScale = scale * (viewBox.width / projection.width);
  // Name a valley only where its label does not sit on one already named,
  // largest valleys first; the valley picker always lists every valley.
  const labelled = useMemo(() => {
    const font = 15 * drawScale;
    const boxes: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
    const shown = new Set<string>();
    const ordered = [...regions].sort(
      (a, b) =>
        Number(b.valley.slug === valleySlug) -
          Number(a.valley.slug === valleySlug) ||
        b.valley.businessCount - a.valley.businessCount ||
        b.valley.placeCount - a.valley.placeCount ||
        a.valley.slug.localeCompare(b.valley.slug),
    );
    for (const { valley, shape } of ordered) {
      const name =
        locale === "cy" && valley.welshName ? valley.welshName : valley.name;
      const half = (name.length * font * 0.5) / 2;
      const y = Math.max(shape.bounds.minY - 8 * drawScale, viewBox.y + font);
      const box = {
        x0: shape.centre.x - half,
        x1: shape.centre.x + half,
        y0: y - font,
        y1: y + font * 0.3,
      };
      const clash = boxes.some(
        (other) =>
          box.x0 < other.x1 &&
          box.x1 > other.x0 &&
          box.y0 < other.y1 &&
          box.y1 > other.y0,
      );
      if (!clash || valley.slug === valleySlug) {
        boxes.push(box);
        shown.add(valley.slug);
      }
    }
    return shown;
  }, [regions, drawScale, locale, valleySlug, viewBox]);
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

  const focusedValley = focused?.valley ?? null;
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

  /** Keeps the address bar shareable without a navigation or a reload. */
  function syncUrl(nextValley: string | null, nextPlace: string | null) {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      for (const [key, value] of [
        ["valley", nextValley],
        ["place", nextPlace],
      ] as const) {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // A URL that cannot be updated must not break the map.
    }
  }

  function choose(slug: string) {
    setSelectedSlug(slug);
    syncUrl(valleySlug, slug);
  }

  function focusValley(slug: string | null) {
    setValleySlug(slug);
    if (isNarrowScreen()) setPickerChoice(false);
    syncUrl(slug, selectedSlug);
  }

  const valleyName = (valley: { name: string; welshName: string | null }) =>
    locale === "cy" && valley.welshName ? valley.welshName : valley.name;
  const valleyHref = (slug: string | null) => {
    const query = new URLSearchParams();
    if (slug) query.set("valley", slug);
    if (category) query.set("category", category.slug);
    const text = query.toString();
    return (text ? `/map?${text}` : "/map") as Route;
  };

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
        syncUrl(valleySlug, nearest[0]!.key);
      },
      () => setLocate({ status: "denied" }),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  return (
    <>
      {valleys.length > 0 ? (
        <details
          className={styles.valleyDetails}
          open={pickerOpen}
          onToggle={(event) => setPickerChoice(event.currentTarget.open)}
        >
          <summary className={styles.valleySummary}>
            {t("map.valleysLabel")}
            {focusedValley ? ` · ${valleyName(focusedValley)}` : ""}
          </summary>
          <nav className={styles.valleyNav} aria-label={t("map.valleysNav")}>
            <Link
              className={styles.valleyChip}
              href={valleyHref(null)}
              aria-current={focusedValley ? undefined : "true"}
              onClick={(event) => {
                event.preventDefault();
                focusValley(null);
              }}
            >
              {t("map.valleyAll")}
            </Link>
            {valleys.map((valley) => (
              <Link
                key={valley.slug}
                className={styles.valleyChip}
                style={{ ["--region-hue" as string]: regionHue(valley.slug) }}
                href={valleyHref(valley.slug)}
                aria-current={
                  focusedValley?.slug === valley.slug ? "true" : undefined
                }
                onClick={(event) => {
                  event.preventDefault();
                  focusValley(valley.slug);
                }}
              >
                {valleyName(valley)} ({valley.placeCount})
              </Link>
            ))}
          </nav>
        </details>
      ) : null}
      <div className={styles.layout}>
        <div className={`${styles.stage} ov-glass`}>
          <svg
            ref={svgRef}
            className={styles.svg}
            data-focused={focusedValley ? "" : undefined}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
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
            <g aria-hidden="true">
              {regions.map(({ valley, shape, hue }) => (
                <g
                  key={valley.slug}
                  className={styles.region}
                  style={{ ["--region-hue" as string]: hue }}
                  data-active={
                    focusedValley?.slug === valley.slug ? "" : undefined
                  }
                  data-quiet={
                    focusedValley && focusedValley.slug !== valley.slug
                      ? ""
                      : undefined
                  }
                  data-valley={valley.slug}
                  onClick={() => focusValley(valley.slug)}
                >
                  <path className={styles.regionShape} d={shape.path} />
                  {labelled.has(valley.slug) ? (
                    <text
                      className={styles.regionLabel}
                      style={{ fontSize: `${15 * drawScale}px` }}
                      x={shape.centre.x}
                      y={Math.max(
                        shape.bounds.minY - 8 * drawScale,
                        viewBox.y + 15 * drawScale,
                      )}
                    >
                      {valleyName(valley)}
                    </text>
                  ) : null}
                </g>
              ))}
            </g>
            {drawOrder.map((place, index) => {
              const point = positions.get(place.slug);
              if (!point) return null;
              const radius = bubbleRadius(place.businessCount) * drawScale;
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
                  data-dim={
                    focusedValley && place.valleySlug !== focusedValley.slug
                      ? ""
                      : undefined
                  }
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
                    r={Math.max(radius, 10 * drawScale)}
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
                      style={{ fontSize: `${14 * drawScale}px` }}
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
                      style={{ fontSize: `${14 * drawScale}px` }}
                      x={point.x}
                      y={point.y + radius + 14 * drawScale}
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
          {focusedValley ? (
            <section
              className={`${styles.card} ov-glass`}
              data-testid="valley-card"
            >
              <p className={styles.subhead}>{t("map.valleysLabel")}</p>
              <h2 className={styles.cardTitle}>{valleyName(focusedValley)}</h2>
              <p className={styles.countLine}>
                {t("map.valleyCounts", {
                  places: focusedValley.placeCount,
                  count: focusedValley.businessCount,
                })}
              </p>
              <p className={styles.subhead}>
                {t("map.valleyPlaces", { valley: valleyName(focusedValley) })}
              </p>
              <ul className={styles.valleyPlaces}>
                {places
                  .filter((place) => place.valleySlug === focusedValley.slug)
                  .sort(
                    (a, b) =>
                      b.businessCount - a.businessCount ||
                      a.name.localeCompare(b.name, "en"),
                  )
                  .map((place) => (
                    <li key={place.slug}>
                      <button
                        type="button"
                        className={styles.linkButton}
                        aria-pressed={place.slug === selectedSlug}
                        onClick={() => choose(place.slug)}
                      >
                        {displayName(place)}
                      </button>
                      <span className={styles.muted}>
                        {" "}
                        · {place.businessCount}
                      </span>
                    </li>
                  ))}
              </ul>
              <div className={styles.actions}>
                <Link
                  className="button primary"
                  href={
                    `/businesses?place=${encodeURIComponent(focusedValley.slug)}${categoryQuery}` as Route
                  }
                >
                  {t("map.valleyBrowse", { valley: valleyName(focusedValley) })}
                </Link>
                <Link
                  className="text-link"
                  href={
                    `/places/${encodeURIComponent(focusedValley.slug)}` as Route
                  }
                >
                  {t("map.valleyAbout", { valley: valleyName(focusedValley) })}
                </Link>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => focusValley(null)}
                >
                  {t("map.valleyClear")}
                </button>
              </div>
            </section>
          ) : null}
          <section className={`${styles.card} ov-glass`} aria-live="polite">
            <h2 className={styles.cardTitle}>
              {selected ? displayName(selected) : t("map.panelTitle")}
            </h2>
            {selected ? (
              <>
                <p className={styles.countLine}>
                  {countLabel(t, selected.businessCount)}
                </p>
                {selected.valleySlug &&
                valleyBySlug.has(selected.valleySlug) ? (
                  <p className={styles.muted}>
                    <Link
                      className="text-link"
                      href={valleyHref(selected.valleySlug)}
                      onClick={(event) => {
                        event.preventDefault();
                        focusValley(selected.valleySlug);
                      }}
                    >
                      {t("map.placeInValley", {
                        valley: valleyName(
                          valleyBySlug.get(selected.valleySlug)!,
                        ),
                      })}
                    </Link>
                  </p>
                ) : null}
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
                    href={
                      `/places/${encodeURIComponent(selected.slug)}` as Route
                    }
                  >
                    {t("map.aboutPlace", { place: displayName(selected) })}
                  </Link>
                  {selected.businessCount === 0 ? (
                    <Link
                      className="text-link"
                      href={suggestBusinessHref(null, displayName(selected))}
                    >
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
                          {place.valleySlug &&
                          valleyBySlug.has(place.valleySlug) ? (
                            <span className={styles.muted}>
                              {" · "}
                              {valleyName(valleyBySlug.get(place.valleySlug)!)}
                            </span>
                          ) : null}
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
    </>
  );
}
