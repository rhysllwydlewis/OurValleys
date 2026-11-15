"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocale } from "@/lib/i18n/client";
import { suggestBusinessHref } from "@/lib/suggest-business-href";
import type { Translator } from "@/lib/i18n/translate";
import {
  OUTSIDE_AREA_KM,
  bubbleRadius,
  nearestPoints,
} from "@/lib/map-projection";
import {
  CONTEXT_LABELS,
  FRAME_ASPECT,
  MAP_FRAME,
  MAX_ZOOM,
  isInsideFrame,
  boxesOverlap,
  nearestOnLine,
  parseSpine,
  placeLabels,
  pointOnLine,
  projectPlaces,
  projectToFrame,
  slantedBox,
  valleysGeography,
  viewAround,
  viewOfPoints,
  widestView,
  zoomView,
  type LabelBox,
  type LabelRequest,
  type MapView,
  type Vertex,
} from "@/lib/valleys-geography";
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
      /** Where the visitor is on the map, when that is inside it. */
      position: Vertex | null;
    };

/** Type sizes in CSS pixels; they are converted to map units when drawn. */
const PLACE_FONT = 13;
const VALLEY_FONT = 13.5;
const ZOOM_STEP = 1.6;
const TYPE_RANK: Record<string, number> = { town: 2, village: 1 };

function isNarrowScreen(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 40rem)").matches
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Let "open in a new tab" and similar clicks use the link's real address. */
function isModifiedClick(event: MouseEvent<HTMLElement>): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
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

/** Marker radius in CSS pixels: a numbered disc, or a small town dot. */
function markerRadius(businessCount: number): number {
  return businessCount > 0
    ? Math.max(11, bubbleRadius(businessCount) * 0.8)
    : 4.2;
}

function toPoints(places: readonly MapPlace[]) {
  return places.map((place) => ({
    key: place.slug,
    latitude: place.latitude,
    longitude: place.longitude,
  }));
}

/** A view as the visitor means it: where they look and how wide. */
type Camera = { x: number; y: number; width: number };

function cameraOf(view: MapView): Camera {
  return {
    x: view.x + view.width / 2,
    y: view.y + view.height / 2,
    width: view.width,
  };
}

function sameView(a: MapView, b: MapView): boolean {
  return (
    Math.abs(a.x - b.x) < 0.05 &&
    Math.abs(a.y - b.y) < 0.05 &&
    Math.abs(a.width - b.width) < 0.05
  );
}

const RIVERS = new Map(
  valleysGeography.valleys.map((river) => [river.slug, river]),
);

/**
 * The land itself: coast, hills, water, roads and railways. It never changes,
 * so it is memoised and panning or zooming only redraws the places.
 */
const Geography = memo(function Geography() {
  const { councils, relief, lakes, riversMinor, riversMajor } =
    valleysGeography;
  return (
    <g aria-hidden="true">
      <rect
        className={styles.sea}
        x={-10}
        y={-10}
        width={MAP_FRAME.width + 20}
        height={MAP_FRAME.height + 20}
      />
      {councils.map((council) => (
        <path key={council.name} className={styles.land} d={council.path} />
      ))}
      <image
        className={styles.relief}
        href={relief.href}
        x={0}
        y={0}
        width={MAP_FRAME.width}
        height={MAP_FRAME.height}
        preserveAspectRatio="none"
      />
      {councils
        .filter((council) => !council.covered)
        .map((council) => (
          <path
            key={council.name}
            className={styles.context}
            d={council.path}
          />
        ))}
      <path className={styles.lake} d={lakes} />
      <path className={styles.riverMinor} d={riversMinor} />
      <path className={styles.riverMajor} d={riversMajor} />
      <path className={styles.rail} d={valleysGeography.rail} />
      <path className={styles.roadCasing} d={valleysGeography.roadsA} />
      <path className={styles.road} d={valleysGeography.roadsA} />
      <path className={styles.motorwayCasing} d={valleysGeography.motorway} />
      <path className={styles.motorway} d={valleysGeography.motorway} />
      {councils
        .filter((council) => council.covered)
        .map((council) => (
          <path
            key={council.name}
            className={styles.boundary}
            d={council.path}
          />
        ))}
    </g>
  );
});

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
  // The place holding keyboard focus stays reachable even if the map is then
  // moved so that it is off screen.
  const [focusSlug, setFocusSlug] = useState<string | null>(null);
  // How the map is drawn on screen: its width in CSS pixels and its shape
  // (height over width; a phone gets a taller map than a desktop).
  const [stage, setStage] = useState({ width: 800, aspect: FRAME_ASPECT });
  const widest = widestView(stage.aspect);
  const svgRef = useRef<SVGSVGElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  // Until hydration the controls cannot respond, so they stay out of the tab
  // order and the accessibility tree; the table below is the fallback.
  const interactive = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const projection = useMemo(
    // Neighbours are kept nine pixels apart at the widest view.
    () =>
      projectPlaces(toPoints(places), { minGap: (9 * widest) / stage.width }),
    [places, widest, stage.width],
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

  // For each valley: the view that frames its places, and where its name
  // sits along its river.
  const valleyShapes = useMemo(() => {
    const shapes = new Map<
      string,
      {
        view: MapView;
        spine: Vertex[];
        label: { share: number; length: number; point: Vertex };
      }
    >();
    for (const valley of valleys) {
      const river = RIVERS.get(valley.slug);
      const points = places
        .filter((place) => place.valleySlug === valley.slug)
        .flatMap((place) => {
          const point = positions.get(place.slug);
          return point ? [point] : [];
        });
      const spine = river ? parseSpine(river.spine) : [];
      const anchors =
        points.length > 0
          ? points
          : river
            ? [
                { x: river.bounds[0]!, y: river.bounds[1]! },
                { x: river.bounds[2]!, y: river.bounds[3]! },
              ]
            : [];
      if (anchors.length === 0) continue;
      const centre = {
        x: anchors.reduce((sum, point) => sum + point.x, 0) / anchors.length,
        y: anchors.reduce((sum, point) => sum + point.y, 0) / anchors.length,
      };
      shapes.set(valley.slug, {
        view: viewOfPoints(anchors, stage.aspect),
        spine,
        label:
          spine.length > 1
            ? nearestOnLine(spine, centre)
            : { share: 0.5, length: 0, point: centre },
      });
    }
    return shapes;
  }, [valleys, places, positions, stage.aspect]);

  // The whole map, or as much of it as the screen's shape allows, centred on
  // the places rather than on the empty sea.
  const homeView = useMemo(() => {
    const xs = projection.points.map((point) => point.x);
    const ys = projection.points.map((point) => point.y);
    const centre =
      xs.length > 0
        ? {
            x: (Math.min(...xs) + Math.max(...xs)) / 2,
            y: (Math.min(...ys) + Math.max(...ys)) / 2,
          }
        : { x: MAP_FRAME.width / 2, y: MAP_FRAME.height / 2 };
    const home = viewAround(centre, MAP_FRAME.width, stage.aspect);
    // A place linked to directly must be on screen, even on a phone whose
    // map cannot show the whole width at once.
    const linked = initialPlace
      ? projection.points.find((point) => point.key === initialPlace)
      : undefined;
    return linked && (linked.x < home.x || linked.x > home.x + home.width)
      ? viewAround(linked, MAP_FRAME.width, stage.aspect)
      : home;
  }, [projection, stage.aspect, initialPlace]);

  // What the visitor is looking at: a centre and a width in map units. The
  // view itself follows from the map's shape, so it stays right when a phone
  // is turned or a window resized.
  const [camera, setCamera] = useState<Camera | null>(() => {
    if (!initialValley) return null;
    const start = projectPlaces(toPoints(places), { minGap: 9 });
    const points = start.points.filter(
      (point) =>
        places.find((place) => place.slug === point.key)?.valleySlug ===
        initialValley,
    );
    return points.length > 0 ? cameraOf(viewOfPoints(points)) : null;
  });
  const view = useMemo(
    () => (camera ? viewAround(camera, camera.width, stage.aspect) : homeView),
    [camera, homeView, stage.aspect],
  );
  const setView = useCallback((next: MapView) => setCamera(cameraOf(next)), []);
  // Map units per CSS pixel. Markers and type are sized in pixels, so they
  // keep their size on screen at every zoom and on every screen.
  const drawScale = view.width / stage.width;
  // Too coarse a view to name every valley as well as its places.
  const smallMap = drawScale > 1.5;
  const canZoomIn = view.width > MAP_FRAME.width / MAX_ZOOM + 0.5;
  const canZoomOut = view.width < widest - 0.5;
  const canPan =
    view.width < MAP_FRAME.width - 0.5 || view.height < MAP_FRAME.height - 0.5;

  const animation = useRef<number | null>(null);
  const stopAnimation = useCallback(() => {
    if (animation.current !== null) {
      cancelAnimationFrame(animation.current);
      animation.current = null;
    }
  }, []);
  /** Glides the map from one view to another (or jumps, for reduced motion). */
  const moveTo = useCallback(
    (target: MapView, from: MapView) => {
      stopAnimation();
      if (prefersReducedMotion() || sameView(target, from)) {
        setView(target);
        return;
      }
      const started = performance.now();
      const duration = 420;
      const step = (now: number) => {
        const progress = Math.min((now - started) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        setView(
          progress >= 1
            ? target
            : {
                x: from.x + (target.x - from.x) * eased,
                y: from.y + (target.y - from.y) * eased,
                width: from.width + (target.width - from.width) * eased,
                height: from.height + (target.height - from.height) * eased,
              },
        );
        animation.current = progress < 1 ? requestAnimationFrame(step) : null;
      };
      animation.current = requestAnimationFrame(step);
    },
    [stopAnimation, setView],
  );
  useEffect(() => stopAnimation, [stopAnimation]);

  useEffect(() => {
    const element = svgRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      if (width > 0 && height > 0) {
        // Whole pixels make the measured shape a hair off the frame's own;
        // treat that as the frame so the full view is exactly the frame.
        const measured = Math.round((height / width) * 1000) / 1000;
        const aspect =
          Math.abs(measured - FRAME_ASPECT) < 0.01 ? FRAME_ASPECT : measured;
        setStage((current) =>
          current.width === width && current.aspect === aspect
            ? current
            : { width, aspect },
        );
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The wheel listener below outlives a render, so it reads the view here.
  const viewRef = useRef({ view, aspect: stage.aspect });
  useEffect(() => {
    viewRef.current = { view, aspect: stage.aspect };
  }, [view, stage.aspect]);

  // Ctrl or Cmd with the wheel (and a trackpad pinch) zooms; a plain wheel
  // still scrolls the page. React's wheel listener is passive, so this one is
  // attached directly in order to stop the browser zooming the whole page.
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      stopAnimation();
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const shareX = (event.clientX - rect.left) / rect.width;
      const shareY = (event.clientY - rect.top) / rect.height;
      const factor = Math.exp(
        -Math.max(Math.min(event.deltaY, 60), -60) * 0.01,
      );
      const { view: current, aspect } = viewRef.current;
      setCamera(
        cameraOf(
          zoomView(
            current,
            factor,
            {
              x: current.x + shareX * current.width,
              y: current.y + shareY * current.height,
            },
            aspect,
          ),
        ),
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [stopAnimation]);

  const focusedValley = valleySlug
    ? (valleyBySlug.get(valleySlug) ?? null)
    : null;
  const selected = selectedSlug ? (bySlug.get(selectedSlug) ?? null) : null;
  const nearestKey =
    locate.status === "found"
      ? locate.nearest.map((item) => item.slug).join("|")
      : "";
  const nearestSlugs = useMemo(
    () => new Set(nearestKey ? nearestKey.split("|") : []),
    [nearestKey],
  );

  // Draw large markers first so small ones stay clickable on top of them.
  const drawOrder = useMemo(
    () => [...places].sort((a, b) => b.businessCount - a.businessCount),
    [places],
  );

  // How far each place's invisible tap area may reach, in map units, before
  // it would cover a numbered marker next to it. A village's tap area is
  // drawn over the markers, and must not take the clicks meant for one.
  const tapReach = useMemo(() => {
    const numbered = places.flatMap((place) => {
      const point = positions.get(place.slug);
      return point && place.businessCount > 0
        ? [{ slug: place.slug, point, count: place.businessCount }]
        : [];
    });
    const reach = new Map<string, number>();
    for (const place of places) {
      const point = positions.get(place.slug);
      if (!point) continue;
      let limit = Infinity;
      for (const other of numbered) {
        if (other.slug === place.slug) continue;
        limit = Math.min(
          limit,
          Math.hypot(other.point.x - point.x, other.point.y - point.y) -
            markerRadius(other.count) * drawScale,
        );
      }
      reach.set(place.slug, limit);
    }
    return reach;
  }, [places, positions, drawScale]);

  // The zoom buttons sit over the top right corner; names keep clear of them.
  const controlsBox = useMemo<LabelBox>(
    () => ({
      x0: view.x + view.width - 64 * drawScale,
      x1: view.x + view.width,
      y0: view.y,
      y1: view.y + 156 * drawScale,
    }),
    [view, drawScale],
  );

  // Where each valley's name goes: on its river, at the spot nearest its own
  // places that is clear of markers and of other valleys' names.
  const valleyLabels = useMemo(() => {
    const font = VALLEY_FONT * drawScale;
    const inView = (point: Vertex) =>
      point.x >= view.x &&
      point.x <= view.x + view.width &&
      point.y >= view.y &&
      point.y <= view.y + view.height;
    // A name over a numbered marker costs far more than one over a dot.
    const markers: Array<{ box: LabelBox; weight: number }> = [
      { box: controlsBox, weight: 200 },
    ];
    for (const place of places) {
      const point = positions.get(place.slug);
      if (!point || !inView(point)) continue;
      const radius = markerRadius(place.businessCount) * drawScale;
      markers.push({
        box: {
          x0: point.x - radius,
          x1: point.x + radius,
          y0: point.y - radius,
          y1: point.y + radius,
        },
        weight: place.businessCount > 0 ? 60 : 10,
      });
      // These places always show their name, first choice just below.
      if (
        place.businessCount > 0 ||
        place.slug === selectedSlug ||
        nearestSlugs.has(place.slug)
      ) {
        const name =
          locale === "cy" && place.welshName ? place.welshName : place.name;
        const width = name.length * PLACE_FONT * drawScale * 0.6;
        markers.push({
          box: {
            x0: point.x - width / 2,
            x1: point.x + width / 2,
            y0: point.y + radius,
            y1: point.y + radius + PLACE_FONT * drawScale * 1.5,
          },
          weight: 60,
        });
      }
    }
    const placed: Array<{
      slug: string;
      name: string;
      box: LabelBox;
      point: Vertex;
    }> = [];
    const ordered = [...valleys].sort(
      (a, b) =>
        Number(b.slug === valleySlug) - Number(a.slug === valleySlug) ||
        b.placeCount - a.placeCount ||
        a.slug.localeCompare(b.slug),
    );
    for (const valley of ordered) {
      const shape = valleyShapes.get(valley.slug);
      if (!shape) continue;
      if (smallMap && valley.slug !== valleySlug) continue;
      const name =
        locale === "cy" && valley.welshName ? valley.welshName : valley.name;
      const width = name.length * font * 0.56;
      const height = font * 1.3;
      const fits = (box: LabelBox) =>
        box.x0 >= view.x &&
        box.x1 <= view.x + view.width &&
        box.y0 >= view.y &&
        box.y1 <= view.y + view.height;
      const candidates: Array<{ point: Vertex; away: number }> = [];
      for (let share = 0.04; share <= 0.96; share += 0.04) {
        const at = pointOnLine(shape.spine, share);
        if (!at) continue;
        const away = Math.abs(share - shape.label.share);
        candidates.push({ point: at.point, away });
        // Just above or below the river, if the river itself is crowded.
        for (const lift of [-height, height]) {
          candidates.push({
            point: { x: at.point.x, y: at.point.y + lift },
            away: away + 0.15,
          });
        }
      }
      if (candidates.length === 0) {
        candidates.push({ point: shape.label.point, away: 0 });
      }
      let best: { cost: number; point: Vertex; box: LabelBox } | null = null;
      for (const candidate of candidates) {
        const box = slantedBox(candidate.point, width, height, 0);
        if (!fits(box)) continue;
        const cost =
          markers.reduce(
            (sum, marker) =>
              sum + (boxesOverlap(box, marker.box) ? marker.weight : 0),
            0,
          ) +
          placed.filter((other) => boxesOverlap(box, other.box)).length * 40 +
          candidate.away * 14;
        if (!best || cost < best.cost) {
          best = { cost, point: candidate.point, box };
        }
      }
      if (!best) continue;
      placed.push({
        slug: valley.slug,
        name,
        box: best.box,
        point: best.point,
      });
    }
    return placed;
  }, [
    valleys,
    valleyShapes,
    places,
    positions,
    view,
    drawScale,
    locale,
    valleySlug,
    smallMap,
    controlsBox,
    selectedSlug,
    nearestSlugs,
  ]);

  // Which place names fit, and where: towns and busy places first.
  const labels = useMemo(() => {
    const font = PLACE_FONT * drawScale;
    const requests: LabelRequest[] = [];
    for (const place of places) {
      const point = positions.get(place.slug);
      if (!point) continue;
      if (
        point.x < view.x ||
        point.x > view.x + view.width ||
        point.y < view.y ||
        point.y > view.y + view.height
      ) {
        continue;
      }
      const name =
        locale === "cy" && place.welshName ? place.welshName : place.name;
      const inFocus = !valleySlug || place.valleySlug === valleySlug;
      requests.push({
        key: place.slug,
        x: point.x,
        y: point.y,
        radius: markerRadius(place.businessCount) * drawScale,
        width: name.length * font * 0.6,
        height: font * 1.25,
        priority:
          (inFocus ? 10_000 : 0) +
          Math.min(place.businessCount, 99) * 10 +
          (TYPE_RANK[place.placeType] ?? 0),
        forced:
          place.businessCount > 0 ||
          place.slug === selectedSlug ||
          nearestSlugs.has(place.slug),
      });
    }
    return placeLabels(requests, view, 2 * drawScale, [
      controlsBox,
      ...valleyLabels.map((label) => label.box),
    ]);
  }, [
    places,
    positions,
    view,
    drawScale,
    locale,
    valleySlug,
    selectedSlug,
    nearestSlugs,
    valleyLabels,
    controlsBox,
  ]);

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

  /** Brings a place into view when it is off screen or hard against an edge. */
  function reveal(slug: string) {
    const point = positions.get(slug);
    if (!point) return;
    const marginX = view.width * 0.08;
    const marginY = view.height * 0.08;
    const comfortable =
      point.x >= view.x + marginX &&
      point.x <= view.x + view.width - marginX &&
      point.y >= view.y + marginY &&
      point.y <= view.y + view.height - marginY;
    if (!comfortable) {
      moveTo(viewAround(point, view.width, stage.aspect), view);
    }
  }

  function choose(slug: string) {
    setSelectedSlug(slug);
    syncUrl(valleySlug, slug);
    reveal(slug);
  }

  function focusValley(slug: string | null) {
    setValleySlug(slug);
    moveTo((slug && valleyShapes.get(slug)?.view) || homeView, view);
    if (isNarrowScreen()) {
      setPickerChoice(false);
      // The focused chip is folded away: keep keyboard focus somewhere real.
      summaryRef.current?.focus();
    }
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

  // --- Moving the map: drag when zoomed in, pinch with two fingers. ---
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | {
        kind: "pan";
        startX: number;
        startY: number;
        view: MapView;
        moved: boolean;
      }
    | { kind: "pinch"; distance: number; view: MapView; anchor: Vertex }
    | null
  >(null);
  // A drag or pinch must not also choose the place it happened to end on.
  const suppressClick = useRef(false);

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // A primary pointer starts a fresh gesture. One released outside the map
    // never reports its end here, and must not be mistaken for a second
    // finger the next time the map is pressed.
    if (event.isPrimary) pointers.current.clear();
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 1) {
      gesture.current = {
        kind: "pan",
        startX: event.clientX,
        startY: event.clientY,
        view,
        moved: false,
      };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      if (!a || !b || rect.width === 0 || rect.height === 0) return;
      stopAnimation();
      gesture.current = {
        kind: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        view,
        anchor: {
          x: view.x + (((a.x + b.x) / 2 - rect.left) / rect.width) * view.width,
          y:
            view.y + (((a.y + b.y) / 2 - rect.top) / rect.height) * view.height,
        },
      };
    }
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const current = gesture.current;
    if (!current) return;
    if (current.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b || !(current.distance > 0)) return;
      suppressClick.current = true;
      setView(
        zoomView(
          current.view,
          Math.hypot(a.x - b.x, a.y - b.y) / current.distance,
          current.anchor,
          stage.aspect,
        ),
      );
      return;
    }
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.moved && Math.hypot(dx, dy) < 6) return;
    // With the whole map showing there is nowhere to go; leave the gesture
    // to the page.
    if (!canPan) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (!current.moved) {
      current.moved = true;
      suppressClick.current = true;
      stopAnimation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is a convenience; the drag still works without it.
      }
    }
    setView(
      viewAround(
        {
          x:
            current.view.x +
            current.view.width / 2 -
            (dx / rect.width) * current.view.width,
          y:
            current.view.y +
            current.view.height / 2 -
            (dy / rect.height) * current.view.height,
        },
        current.view.width,
        stage.aspect,
      ),
    );
  }

  function onPointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    const [remaining] = [...pointers.current.values()];
    if (remaining) {
      // One finger of a pinch is still down: carry on as a drag from here.
      gesture.current = {
        kind: "pan",
        startX: remaining.x,
        startY: remaining.y,
        view,
        moved: true,
      };
      return;
    }
    gesture.current = null;
    if (suppressClick.current) {
      // The click that ends this gesture fires before the timer does.
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
  }

  function onPlaceClick(slug: string) {
    if (suppressClick.current) return;
    choose(slug);
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>, slug: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(slug);
    }
  }

  /** Arrow keys move a zoomed map; plus and minus zoom it. */
  function onMapKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const stepX = view.width * 0.2;
    const stepY = view.height * 0.2;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-stepX, 0],
      ArrowRight: [stepX, 0],
      ArrowUp: [0, -stepY],
      ArrowDown: [0, stepY],
    };
    const move = moves[event.key];
    if (move) {
      if (!canPan) return;
      event.preventDefault();
      moveTo(
        viewAround(
          {
            x: view.x + view.width / 2 + move[0],
            y: view.y + view.height / 2 + move[1],
          },
          view.width,
          stage.aspect,
        ),
        view,
      );
    } else if (event.key === "+" || event.key === "=") {
      if (!canZoomIn) return;
      event.preventDefault();
      zoomBy(ZOOM_STEP);
    } else if (event.key === "-" || event.key === "_") {
      if (!canZoomOut) return;
      event.preventDefault();
      zoomBy(1 / ZOOM_STEP);
    }
  }

  function zoomBy(factor: number) {
    moveTo(
      zoomView(
        view,
        factor,
        { x: view.x + view.width / 2, y: view.y + view.height / 2 },
        stage.aspect,
      ),
      view,
    );
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
        const origin = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const nearest = nearestPoints(origin, toPoints(places), 3);
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
          position: isInsideFrame(origin) ? projectToFrame(origin) : null,
        });
        choose(nearest[0]!.key);
      },
      () => setLocate({ status: "denied" }),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  const valleyFont = VALLEY_FONT * drawScale;
  const here = locate.status === "found" ? locate.position : null;

  return (
    <div className={styles.layout}>
      {valleys.length > 0 ? (
        <details
          className={styles.valleyDetails}
          open={pickerOpen}
          onToggle={(event) => {
            // React's own change to `open` also fires `toggle`; only a
            // difference from what is rendered is a choice by the visitor.
            if (event.currentTarget.open !== pickerOpen) {
              setPickerChoice(event.currentTarget.open);
            }
          }}
        >
          <summary ref={summaryRef} className={styles.valleySummary}>
            {t("map.valleysLabel")}
            {focusedValley ? ` · ${valleyName(focusedValley)}` : ""}
          </summary>
          <nav className={styles.valleyNav} aria-label={t("map.valleysNav")}>
            <Link
              className={styles.valleyChip}
              href={valleyHref(null)}
              aria-current={focusedValley ? undefined : "true"}
              onClick={(event) => {
                if (isModifiedClick(event)) return;
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
                href={valleyHref(valley.slug)}
                aria-current={
                  focusedValley?.slug === valley.slug ? "true" : undefined
                }
                onClick={(event) => {
                  if (isModifiedClick(event)) return;
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
      <div className={styles.stage}>
        {/* Keys pressed on a place or a zoom button bubble up to here. */}
        <div
          className={styles.canvas}
          onKeyDown={onMapKeyDown}
          style={{
            ["--map-aspect" as string]: `${MAP_FRAME.width} / ${MAP_FRAME.height}`,
          }}
        >
          <svg
            ref={svgRef}
            className={styles.svg}
            data-focused={focusedValley ? "" : undefined}
            data-pan={canPan ? (canZoomOut ? "both" : "sideways") : undefined}
            viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
            role="group"
            aria-label={t("map.mapLabel")}
            aria-describedby="valleys-map-hint"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onPointerLeave={onPointerEnd}
          >
            <Geography />
            <g aria-hidden="true">
              {valleysGeography.valleys.map((river) => {
                const valley = valleyBySlug.get(river.slug);
                return (
                  <g
                    key={river.slug}
                    className={styles.valley}
                    data-valley={river.slug}
                    data-active={
                      focusedValley?.slug === river.slug ? "" : undefined
                    }
                    data-quiet={
                      focusedValley && focusedValley.slug !== river.slug
                        ? ""
                        : undefined
                    }
                    data-link={valley ? "" : undefined}
                    onClick={
                      valley
                        ? () => {
                            if (!suppressClick.current) {
                              focusValley(river.slug);
                            }
                          }
                        : undefined
                    }
                  >
                    <path className={styles.valleyGlow} d={river.path} />
                    <path className={styles.valleyRiver} d={river.path} />
                    {valley ? (
                      <path className={styles.valleyHit} d={river.path} />
                    ) : null}
                  </g>
                );
              })}
            </g>
            <g aria-hidden="true">
              {CONTEXT_LABELS.map((label) => (
                <text
                  key={label.key}
                  className={styles.contextLabel}
                  data-kind={label.kind}
                  style={{ fontSize: `${12 * drawScale}px` }}
                  x={label.position.x}
                  y={label.position.y}
                  textAnchor={label.anchor}
                >
                  {locale === "cy" ? label.welshName : label.name}
                </text>
              ))}
              {valleyLabels.map((label) => {
                const isFocused = focusedValley?.slug === label.slug;
                return (
                  <text
                    key={label.slug}
                    className={styles.valleyLabel}
                    data-active={isFocused ? "" : undefined}
                    data-quiet={focusedValley && !isFocused ? "" : undefined}
                    style={{ fontSize: `${valleyFont}px` }}
                    textAnchor="middle"
                    x={label.point.x}
                    y={label.point.y + valleyFont * 0.34}
                  >
                    {label.name}
                  </text>
                );
              })}
            </g>
            {here ? (
              <g aria-hidden="true" className={styles.here}>
                <circle
                  className={styles.herePulse}
                  cx={here.x}
                  cy={here.y}
                  r={16 * drawScale}
                />
                <circle
                  className={styles.hereDot}
                  cx={here.x}
                  cy={here.y}
                  r={6 * drawScale}
                  style={{ strokeWidth: 2.5 * drawScale }}
                />
              </g>
            ) : null}
            {drawOrder.map((place, index) => {
              const point = positions.get(place.slug);
              if (!point) return null;
              // Places outside the view cannot be seen, so they are neither
              // focusable nor announced; the valley card and the list below
              // still have them.
              const inView =
                place.slug === focusSlug ||
                (point.x >= view.x &&
                  point.x <= view.x + view.width &&
                  point.y >= view.y &&
                  point.y <= view.y + view.height);
              const radius = markerRadius(place.businessCount) * drawScale;
              const isSelected = place.slug === selectedSlug;
              const isNearest = nearestSlugs.has(place.slug);
              const label = labels.get(place.slug);
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
                  tabIndex={interactive && inView ? 0 : undefined}
                  aria-hidden={interactive && inView ? undefined : true}
                  aria-pressed={interactive ? isSelected : undefined}
                  aria-label={placeAriaLabel(
                    t,
                    displayName(place),
                    place.businessCount,
                  )}
                  onFocus={() => setFocusSlug(place.slug)}
                  onBlur={() =>
                    setFocusSlug((current) =>
                      current === place.slug ? null : current,
                    )
                  }
                  onClick={() => onPlaceClick(place.slug)}
                  onKeyDown={(event) => onKeyDown(event, place.slug)}
                  style={{ animationDelay: `${Math.min(index, 30) * 14}ms` }}
                >
                  <circle
                    className={styles.hit}
                    cx={point.x}
                    cy={point.y}
                    r={Math.max(
                      radius,
                      Math.min(
                        12 * drawScale,
                        tapReach.get(place.slug) ?? Infinity,
                      ),
                    )}
                  />
                  {isSelected ? (
                    <circle
                      className={styles.ring}
                      cx={point.x}
                      cy={point.y}
                      r={radius + 5 * drawScale}
                      style={{ strokeWidth: 2.5 * drawScale }}
                    />
                  ) : null}
                  <circle
                    className={styles.marker}
                    cx={point.x}
                    cy={point.y}
                    r={radius}
                    style={{
                      strokeWidth:
                        (place.businessCount > 0 ? 2.5 : 1.8) * drawScale,
                    }}
                  />
                  {place.businessCount > 0 ? (
                    <text
                      className={styles.count}
                      style={{ fontSize: `${12.5 * drawScale}px` }}
                      x={point.x}
                      y={point.y}
                      aria-hidden="true"
                    >
                      {place.businessCount}
                    </text>
                  ) : null}
                  {label ? (
                    <text
                      className={styles.label}
                      style={{ fontSize: `${PLACE_FONT * drawScale}px` }}
                      x={label.x}
                      y={label.y}
                      textAnchor={label.anchor}
                      aria-hidden="true"
                    >
                      {displayName(place)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
          <div
            className={styles.zoom}
            role="group"
            aria-label={t("map.zoomGroup")}
          >
            <button
              type="button"
              className={styles.zoomButton}
              aria-label={t("map.zoomIn")}
              title={t("map.zoomIn")}
              disabled={!interactive || !canZoomIn}
              onClick={() => zoomBy(ZOOM_STEP)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 4v12M4 10h12" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.zoomButton}
              aria-label={t("map.zoomOut")}
              title={t("map.zoomOut")}
              disabled={!interactive || !canZoomOut}
              onClick={() => zoomBy(1 / ZOOM_STEP)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 10h12" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.zoomButton}
              aria-label={t("map.zoomReset")}
              title={t("map.zoomReset")}
              disabled={!interactive || !canZoomOut}
              onClick={() => moveTo(homeView, view)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4" />
              </svg>
            </button>
          </div>
        </div>
        <ul className={styles.legend} aria-label={t("map.legendLabel")}>
          <li>
            <span className={styles.keyBusiness} aria-hidden="true">
              3
            </span>
            {t("map.legendBusinesses")}
          </li>
          <li>
            <span className={styles.keyPlace} aria-hidden="true" />
            {t("map.legendPlace")}
          </li>
          <li>
            <span className={styles.keyRiver} aria-hidden="true" />
            {t("map.legendRiver")}
          </li>
          <li>
            <span className={styles.keyRoad} aria-hidden="true" />
            {t("map.legendRoad")}
          </li>
          <li>
            <span className={styles.keyRail} aria-hidden="true" />
            {t("map.legendRail")}
          </li>
          {here ? (
            <li>
              <span className={styles.keyYou} aria-hidden="true" />
              {t("map.legendYou")}
            </li>
          ) : null}
        </ul>
        <p id="valleys-map-hint" className={styles.hint}>
          {t("map.mapHint")}
        </p>
        <p className={styles.attribution}>{t("map.attribution")}</p>
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
              {selected.valleySlug && valleyBySlug.has(selected.valleySlug) ? (
                <p className={styles.muted}>
                  <Link
                    className="text-link"
                    href={valleyHref(selected.valleySlug)}
                    onClick={(event) => {
                      if (isModifiedClick(event)) return;
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
                  href={`/places/${encodeURIComponent(selected.slug)}` as Route}
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
  );
}
