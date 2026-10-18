"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const storageKey = "ov-nav-from";
/** A client-side hop lands within moments; anything older is a different visit. */
const freshMs = 10_000;

/**
 * Remembers the page a visitor is leaving. A link followed inside the app does
 * not change `document.referrer`, which keeps naming whatever loaded the
 * original document, so without this a visitor who found the directory through
 * a search engine would be counted as coming from the search engine.
 * Rendered by the site header, which every browse page includes.
 */
export function NavigationSourceRecorder() {
  const pathname = usePathname();
  useEffect(
    () => () => {
      try {
        window.sessionStorage.setItem(
          storageKey,
          JSON.stringify({ path: pathname, at: Date.now() }),
        );
      } catch {
        // Attribution falls back to the referrer.
      }
    },
    [pathname],
  );
  return null;
}

/** The page just left, once, or null when this was a fresh document load. */
export function takeNavigationSource(now: number = Date.now()): string | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    window.sessionStorage.removeItem(storageKey);
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "path" in parsed &&
      "at" in parsed &&
      typeof parsed.path === "string" &&
      typeof parsed.at === "number" &&
      parsed.path.startsWith("/") &&
      now - parsed.at >= 0 &&
      now - parsed.at <= freshMs
    ) {
      return parsed.path;
    }
  } catch {
    // Unreadable storage means no client-side source.
  }
  return null;
}
