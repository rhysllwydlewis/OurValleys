"use client";

import { useLayoutEffect } from "react";

export function HomeEnhancements() {
  useLayoutEffect(() => {
    // Browsers restore the scroll position a page was left at by default
    // (history.scrollRestoration "auto"), which on the homepage shows up
    // as landing a little way down the hero instead of at the very top.
    // Force manual restoration and land at 0 unless a section anchor
    // (e.g. #discover) was explicitly requested.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }

    const root = document.querySelector<HTMLElement>("[data-home-root]");
    if (!root) return;

    const revealElements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-home-reveal]"),
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      root.dataset.motion = "reduced";
      revealElements.forEach((element) => {
        element.dataset.revealState = "visible";
      });
      return;
    }

    root.dataset.motion = "ready";
    revealElements.forEach((element) => {
      element.dataset.revealState = "pending";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          target.dataset.revealState = "visible";
          observer.unobserve(target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      delete root.dataset.motion;
    };
  }, []);

  return null;
}
