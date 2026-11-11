"use client";

import { useEffect, useRef } from "react";

/**
 * On narrow screens the dashboard navigation is a horizontally scrolling
 * strip, so the current page's link can start off-screen. This scrolls the
 * strip (never the page) so the current link is in view. It renders an empty
 * marker element and does nothing when the strip does not scroll.
 */
export function ActiveTabIntoView() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nav = marker.current?.closest("[data-dashboard-nav]");
    const strip = nav?.querySelector<HTMLElement>(
      "[data-dashboard-nav-scroll]",
    );
    const active = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !active) return;
    if (strip.scrollWidth <= strip.clientWidth + 1) return;

    const stripBox = strip.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    const offset =
      activeBox.left - stripBox.left - (stripBox.width - activeBox.width) / 2;
    strip.scrollLeft += offset;
  }, []);

  return <span ref={marker} hidden />;
}
