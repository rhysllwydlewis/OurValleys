"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./designer.module.css";
import { DeviceIcon } from "./designer-icons";
import { PREVIEW_OPEN_EVENT, SIDE_BY_SIDE_QUERY } from "./studio-events";

type Device = "desktop" | "tablet" | "mobile";

/**
 * The width each device is rendered at. The frame is laid out at this real
 * width and then scaled down to fit the pane, so "Desktop" shows the true
 * desktop layout instead of whatever layout a narrow column would trigger.
 */
const deviceWidth: Record<Device, number> = {
  desktop: 1280,
  tablet: 820,
  mobile: 390,
};
const deviceOrder: readonly Device[] = ["desktop", "tablet", "mobile"];
/** A phone is never drawn taller than a real one. */
const phoneMaxHeight = 844;

type Slot = 0 | 1;

/**
 * Shows the real private preview with the choices currently set in the
 * appearance form, before anything is saved. The form is read through its id,
 * and the frame's address carries the choices, which the preview checks
 * against the approved lists. Nothing here saves or publishes anything.
 *
 * Two frames are kept: the next version loads out of sight and takes over
 * once it is ready, at the same scroll position, so the page never blanks or
 * jumps back to the top while choices are being made.
 */
export function LivePreview({
  formId,
  previewPath,
  sectionIds,
  locale,
  text,
}: {
  formId: string;
  previewPath: string;
  sectionIds: string[];
  /** The reader's language: the preview only needs the text it will show. */
  locale: "en" | "cy";
  text: {
    title: string;
    note: string;
    frame: string;
    width: string;
    desktop: string;
    tablet: string;
    mobile: string;
    updating: string;
    openFull: string;
    close: string;
    privateLabel: string;
  };
}) {
  const initial = `${previewPath}?frame=1`;
  const [sources, setSources] = useState<[string | null, string | null]>([
    initial,
    null,
  ]);
  const [active, setActive] = useState<Slot>(0);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<Device>("desktop");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stage, setStage] = useState<{ width: number; height: number } | null>(
    null,
  );

  const target = useRef(initial);
  const activeRef = useRef<Slot>(0);
  const focusSection = useRef<string | null>(null);
  const settleRun = useRef(0);
  // True while a frame is fetching a page (the first one starts at once).
  const inFlight = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frames = useRef<[HTMLIFrameElement | null, HTMLIFrameElement | null]>([
    null,
    null,
  ]);
  const root = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  /** Puts a fully arrived frame on show, at the right scroll position. */
  const show = useCallback((slot: Slot, frame: HTMLIFrameElement) => {
    const previous = frames.current[slot === 0 ? 1 : 0];
    try {
      const view = frame.contentWindow;
      const section = focusSection.current;
      const anchor = section
        ? view?.document.getElementById(section)
        : undefined;
      // "instant": the page itself asks for smooth scrolling, which would
      // otherwise animate from the top every time.
      if (view && anchor) {
        const top = anchor.getBoundingClientRect().top + view.scrollY - 96;
        view.scrollTo({ top: Math.max(0, top), behavior: "instant" });
      } else if (view && slot !== activeRef.current) {
        view.scrollTo({
          top: previous?.contentWindow?.scrollY ?? 0,
          behavior: "instant",
        });
      }
    } catch {
      // The frame is same-origin; if it ever is not, it starts at the top.
    }
    activeRef.current = slot;
    setActive(slot);
    inFlight.current = false;
    setLoading(frame.getAttribute("src") !== target.current);
  }, []);

  /** Brings an address into view through whichever frame is not on show. */
  const loadIntoSpare = useCallback(
    (address: string) => {
      const spare: Slot = activeRef.current === 0 ? 1 : 0;
      const frame = frames.current[spare];
      if (frame && frame.getAttribute("src") === address) {
        // Going back to the choices from a moment ago: that page is already
        // sitting in the spare frame, and setting the same address again
        // would not load anything, so just swap to it.
        show(spare, frame);
        return;
      }
      inFlight.current = true;
      setSources((current) => {
        const updated: [string | null, string | null] = [...current];
        updated[spare] = address;
        return updated;
      });
    },
    [show],
  );

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) return;

    function read() {
      const data = new FormData(form as HTMLFormElement);
      const hidden = sectionIds.filter(
        (id) => data.get(`visible-${id}`) !== "on",
      );
      const order = [...sectionIds].sort(
        (a, b) =>
          Number(data.get(`position-${a}`) ?? 0) -
          Number(data.get(`position-${b}`) ?? 0),
      );
      const layouts = sectionIds
        .map((id) => `${id}:${String(data.get(`layout-${id}`) ?? "")}`)
        .join(",");
      // Only the text the frame will show travels in the address: the
      // reader's language, or the other language where that is all there is.
      const other = locale === "cy" ? "en" : "cy";
      const copy: Record<string, Record<string, Record<string, string>>> = {};
      for (const id of sectionIds) {
        for (const field of ["heading", "intro"] as const) {
          const own = String(data.get(`${field}-${id}-${locale}`) ?? "");
          const fallback = String(data.get(`${field}-${id}-${other}`) ?? "");
          const language = own ? locale : fallback ? other : null;
          if (!language) continue;
          const entry = (copy[id] ??= {});
          entry[field] = { [language]: own || fallback };
        }
      }
      // Keep the address well inside server header limits: past the budget,
      // later sections are left out of the preview (they still save).
      const budget = 6000;
      let used = 0;
      for (const id of Object.keys(copy)) {
        used += encodeURIComponent(JSON.stringify(copy[id])).length;
        if (used > budget) delete copy[id];
      }
      const params = new URLSearchParams({
        frame: "1",
        template: String(data.get("templateKey") ?? ""),
        accent: String(data.get("accentKey") ?? ""),
        corners: String(data.get("cornerKey") ?? ""),
        typeface: String(data.get("typefaceKey") ?? ""),
        hide: hidden.join(","),
        order: order.join(","),
        layouts,
        copy: JSON.stringify(copy),
      });
      return `${previewPath}?${params.toString()}`;
    }

    function schedule(event: Event) {
      // A change to one section brings that section into view in the preview;
      // a change to the overall style keeps the reader where they are.
      const section = sectionFromEvent(event, form as HTMLFormElement);
      if (section !== undefined) focusSection.current = section;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const next = read();
        if (next === target.current) return;
        target.current = next;
        setLoading(true);
        if (!stageRef.current?.offsetParent) {
          // The pane is not on screen (narrow layout, sheet closed), so its
          // frames are not mounted: just remember what to show when it opens.
          activeRef.current = 0;
          setActive(0);
          setSources([next, null]);
          inFlight.current = true;
          return;
        }
        // One page loads at a time. Replacing a page that is still arriving
        // cuts its stream short; instead the frame that is loading finishes,
        // sees it has been overtaken and fetches the newest choices itself.
        if (inFlight.current) return;
        loadIntoSpare(next);
      }, 350);
    }

    function sectionFromEvent(event: Event, owner: HTMLFormElement) {
      const element = event.target;
      if (element === owner) {
        // The section rows announce a move on the form itself.
        return owner.dataset.movedSection ?? undefined;
      }
      if (!(
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
      )) {
        return undefined;
      }
      const match = /^(?:visible|layout|heading|intro)-([a-z]+)/.exec(
        element.name,
      );
      if (match && sectionIds.includes(match[1]!)) return match[1];
      return null;
    }

    form.addEventListener("change", schedule);
    form.addEventListener("input", schedule);
    return () => {
      form.removeEventListener("change", schedule);
      form.removeEventListener("input", schedule);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [formId, previewPath, sectionIds, locale, loadIntoSpare]);

  // The page arrives in pieces: at the frame's load event the sections that
  // were streamed in are still waiting to be placed, so the document is short
  // and nothing can be scrolled to yet. The frame is only shown once that has
  // finished, which is also what keeps a half-drawn page off the screen.
  function handleLoad(slot: Slot) {
    const frame = frames.current[slot];
    if (!frame) return;
    if (frame.getAttribute("src") !== target.current) {
      // Overtaken while loading. If the wanted page is the one already on
      // show (the choice was put back), there is nothing left to fetch.
      const otherSlot: Slot = slot === 0 ? 1 : 0;
      const other = frames.current[otherSlot];
      if (other && other.getAttribute("src") === target.current) {
        show(otherSlot, other);
      } else {
        inFlight.current = false;
        loadIntoSpare(target.current);
      }
      return;
    }
    const run = ++settleRun.current;
    // Checked every 60ms and given up on after about two and a half seconds.
    let checks = 0;
    let lastHeight = -1;
    let steady = 0;
    const check = () => {
      if (run !== settleRun.current || frames.current[slot] !== frame) return;
      if (frame.getAttribute("src") !== target.current) {
        // Overtaken while settling: this page is complete, so show it and
        // then fetch the newer choices behind it.
        show(slot, frame);
        loadIntoSpare(target.current);
        return;
      }
      let settled = true;
      try {
        const page = frame.contentDocument;
        const height = page?.documentElement.scrollHeight ?? 0;
        // React's markers for streamed content that has not been placed yet.
        const waiting = page?.querySelector(
          'template[id^="B:"], div[hidden][id^="S:"]',
        );
        steady = height === lastHeight ? steady + 1 : 0;
        lastHeight = height;
        settled = !waiting && steady >= 2;
      } catch {
        // The frame is same-origin; if it ever is not, show it as it is.
      }
      checks += 1;
      if (settled || checks > 40) {
        show(slot, frame);
        return;
      }
      window.setTimeout(check, 60);
    };
    check();
  }

  // A frame still settling when the pane goes away must not report back.
  useEffect(
    () => () => {
      settleRun.current += 1;
    },
    [],
  );

  // The pane's size decides the scale; a hidden pane (narrow screens, sheet
  // closed) measures nothing and so mounts and loads nothing.
  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const width =
        box.width -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const height =
        box.height -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom);
      setStage((current) => {
        // A pane that is not displayed measures nothing: drop the frames, so
        // a closed sheet does not go on loading pages nobody can see.
        if (width < 40 || height < 40) return null;
        if (
          current &&
          Math.abs(current.width - width) < 1 &&
          Math.abs(current.height - height) < 1
        ) {
          return current;
        }
        return { width, height };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  // The save bar's "Preview" button opens the pane as a full-screen sheet on
  // screens too narrow to show it beside the controls.
  useEffect(() => {
    function open(event: Event) {
      opener.current =
        event instanceof CustomEvent && event.detail instanceof HTMLElement
          ? event.detail
          : null;
      // A phone shows the phone layout first: the desktop one would be
      // scaled too small to read.
      if (window.innerWidth < 640) setDevice("mobile");
      setSheetOpen(true);
    }
    document.addEventListener(PREVIEW_OPEN_EVENT, open);
    return () => document.removeEventListener(PREVIEW_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const element = root.current;
    if (!element) return;
    // Everything outside the sheet is taken out of reach while it is open.
    const silenced: HTMLElement[] = [];
    for (
      let node: HTMLElement | null = element;
      node && node !== document.body;
      node = node.parentElement
    ) {
      for (const sibling of node.parentElement?.children ?? []) {
        if (
          sibling !== node &&
          sibling instanceof HTMLElement &&
          !sibling.inert
        ) {
          sibling.inert = true;
          silenced.push(sibling);
        }
      }
    }
    const scroll = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeSheet();
    }
    document.addEventListener("keydown", onKey);
    // If the window grows wide enough to show the pane inline, the sheet is
    // no longer a sheet: release the page.
    const wide = window.matchMedia(SIDE_BY_SIDE_QUERY);
    const onWide = () => {
      if (wide.matches) setSheetOpen(false);
    };
    wide.addEventListener("change", onWide);
    return () => {
      for (const sibling of silenced) sibling.inert = false;
      document.documentElement.style.overflow = scroll;
      // Back to whatever opened the sheet, now that it can take focus again.
      opener.current?.focus();
      opener.current = null;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [sheetOpen, closeSheet]);

  // Geometry: lay the frame out at the device's real width, then scale.
  const virtualWidth = deviceWidth[device];
  const chrome = device === "mobile" ? 20 : 34;
  const available = stage
    ? {
        width: Math.max(120, stage.width - (device === "mobile" ? 20 : 0)),
        height: Math.max(160, stage.height - chrome),
      }
    : null;
  const scale = available ? Math.min(1, available.width / virtualWidth) : 1;
  const virtualHeight = available
    ? device === "mobile"
      ? Math.min(phoneMaxHeight, available.height / scale)
      : available.height / scale
    : 0;

  // "Open the full preview" shows what the pane shows, unsaved choices
  // included: the same address without the frame flag.
  const shown = sources[active] ?? initial;
  const shownQuery = new URLSearchParams(shown.split("?")[1] ?? "");
  shownQuery.delete("frame");
  const fullHref = shownQuery.size
    ? `${previewPath}?${shownQuery.toString()}`
    : previewPath;

  return (
    <aside
      ref={root}
      className={styles.preview}
      aria-label={text.title}
      data-sheet={sheetOpen ? "open" : undefined}
      role={sheetOpen ? "dialog" : undefined}
      aria-modal={sheetOpen ? true : undefined}
    >
      <div className={styles.previewBar}>
        <div className={styles.previewHead}>
          <p className={styles.previewTitle}>
            <span
              className={styles.liveDot}
              data-busy={loading || undefined}
              aria-hidden="true"
            />
            {text.title}
          </p>
          <p className={styles.previewNote}>{text.note}</p>
        </div>
        <div className={styles.devices} role="group" aria-label={text.width}>
          {deviceOrder.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={device === option}
              onClick={() => setDevice(option)}
            >
              <DeviceIcon device={option} />
              <span>{text[option]}</span>
            </button>
          ))}
        </div>
        <button
          ref={closeButton}
          type="button"
          className={`button ${styles.sheetClose}`}
          onClick={closeSheet}
        >
          {text.close}
        </button>
      </div>

      <div
        ref={stageRef}
        className={styles.stage}
        data-device={device}
        aria-busy={loading}
      >
        {available ? (
          <div
            className={styles.device}
            data-device={device}
            style={{
              width: virtualWidth * scale + (device === "mobile" ? 20 : 0),
            }}
          >
            {device === "mobile" ? null : (
              <div className={styles.chrome} aria-hidden="true">
                <span className={styles.chromeDots}>
                  <i />
                  <i />
                  <i />
                </span>
                <span className={styles.chromeAddress}>
                  {text.privateLabel}
                </span>
              </div>
            )}
            <div
              className={styles.screen}
              style={{
                width: virtualWidth * scale,
                height: virtualHeight * scale,
              }}
            >
              {([0, 1] as const).map((slot) =>
                sources[slot] ? (
                  <iframe
                    key={slot}
                    ref={(element) => {
                      frames.current[slot] = element;
                    }}
                    className={styles.frame}
                    data-active={slot === active || undefined}
                    title={slot === active ? text.frame : undefined}
                    aria-hidden={slot === active ? undefined : true}
                    tabIndex={slot === active ? undefined : -1}
                    src={sources[slot]!}
                    onLoad={() => handleLoad(slot)}
                    style={{
                      width: virtualWidth,
                      height: virtualHeight,
                      transform: `scale(${scale})`,
                    }}
                  />
                ) : null,
              )}
            </div>
          </div>
        ) : null}
        {loading && available ? (
          <p className={styles.frameLoading} role="status">
            {text.updating}
          </p>
        ) : null}
      </div>

      <p className={styles.previewFoot}>
        <a href={fullHref} target="_blank" rel="noreferrer">
          {text.openFull}
          <span aria-hidden="true"> ↗</span>
        </a>
      </p>
    </aside>
  );
}
