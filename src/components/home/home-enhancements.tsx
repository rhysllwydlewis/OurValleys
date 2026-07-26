"use client";

import { useLayoutEffect } from "react";

export function HomeEnhancements() {
  useLayoutEffect(() => {
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
