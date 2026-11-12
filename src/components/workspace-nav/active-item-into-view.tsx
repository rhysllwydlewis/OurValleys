"use client";

import { useEffect, useRef } from "react";

/**
 * On narrow screens a workspace navigation is a horizontally scrolling
 * strip, so the current page's link can start off-screen. This scrolls the
 * strip (never the page) so the current link is in view, and marks which
 * ends have more to scroll so only those edges fade. It renders an empty
 * marker element and does nothing visible when the strip does not scroll.
 */
export function ActiveItemIntoView() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nav = marker.current?.closest("[data-workspace-nav]");
    const strip = nav?.querySelector<HTMLElement>(
      "[data-workspace-nav-scroll]",
    );
    if (!strip) return;

    const markEdges = () => {
      const max = strip.scrollWidth - strip.clientWidth;
      strip.toggleAttribute("data-more-start", strip.scrollLeft > 1);
      strip.toggleAttribute("data-more-end", strip.scrollLeft < max - 1);
    };

    const active = strip.querySelector<HTMLElement>('[aria-current="page"]');
    if (active && strip.scrollWidth > strip.clientWidth + 1) {
      const stripBox = strip.getBoundingClientRect();
      const activeBox = active.getBoundingClientRect();
      strip.scrollLeft +=
        activeBox.left - stripBox.left - (stripBox.width - activeBox.width) / 2;
    }
    markEdges();

    strip.addEventListener("scroll", markEdges, { passive: true });
    window.addEventListener("resize", markEdges);
    return () => {
      strip.removeEventListener("scroll", markEdges);
      window.removeEventListener("resize", markEdges);
    };
  }, []);

  return <span ref={marker} hidden />;
}
