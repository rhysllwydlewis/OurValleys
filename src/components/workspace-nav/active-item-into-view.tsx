"use client";

import { useEffect, useRef } from "react";

/**
 * On narrow screens a workspace navigation is a horizontally scrolling
 * strip, so the current page's link can start off-screen. This scrolls the
 * strip (never the page) so the current link is in view, and marks which
 * ends have more to scroll so only those edges fade. It renders an empty
 * marker element and does nothing visible when the strip does not scroll.
 */
export function ActiveItemIntoView({ current }: { current: string | null }) {
  const marker = useRef<HTMLSpanElement>(null);

  const findStrip = () =>
    marker.current
      ?.closest("[data-workspace-nav]")
      ?.querySelector<HTMLElement>("[data-workspace-nav-scroll]") ?? null;

  // Fade only the edges with more to scroll, kept up to date while the
  // strip is scrolled or the window resized.
  useEffect(() => {
    const strip = findStrip();
    if (!strip) return;
    const markEdges = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      strip.toggleAttribute("data-more-start", strip.scrollLeft > 1);
      strip.toggleAttribute("data-more-end", strip.scrollLeft < max - 1);
    };
    markEdges();
    strip.addEventListener("scroll", markEdges, { passive: true });
    window.addEventListener("resize", markEdges);
    return () => {
      strip.removeEventListener("scroll", markEdges);
      window.removeEventListener("resize", markEdges);
    };
  }, []);

  // Bring the current link into view on first render and whenever it
  // changes: a navigation kept in a persistent layout (the admin area) is
  // not remounted by client-side navigation.
  useEffect(() => {
    const strip = findStrip();
    const active = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!strip || !active) return;
    if (strip.scrollWidth <= strip.clientWidth + 1) return;
    const stripBox = strip.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    strip.scrollLeft +=
      activeBox.left - stripBox.left - (stripBox.width - activeBox.width) / 2;
    // Setting scrollLeft fires a scroll event, which refreshes the fades.
  }, [current]);

  return <span ref={marker} hidden />;
}
