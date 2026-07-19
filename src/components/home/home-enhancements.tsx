"use client";

import { useEffect } from "react";

export function HomeEnhancements() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-home-root]");
    if (!root) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      root.dataset.motion = "reduced";
      return;
    }

    root.dataset.motion = "ready";
    const revealElements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-home-reveal]"),
    );
    revealElements.forEach((element) => {
      element.dataset.revealState = "pending";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.revealState = "visible";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 },
    );
    revealElements.forEach((element) => observer.observe(element));

    const heroMedia = root.querySelector<HTMLElement>("[data-home-parallax]");
    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      if (!heroMedia) return;
      const offset = Math.min(window.scrollY * 0.11, 72);
      heroMedia.style.setProperty("--home-parallax", `${offset}px`);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateParallax);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      delete root.dataset.motion;
    };
  }, []);

  return null;
}
