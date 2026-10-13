"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  addRecentSearch,
  parseRecentSearches,
  searchHref,
} from "@/modules/search/search-filters";
import styles from "./search.module.css";

const STORAGE_KEY = "ov-recent-searches";
const CHANGE_EVENT = "ov-recent-searches-change";

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private windows and blocked storage: recent searches are a convenience.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Recent searches, kept only in this browser. On a results page it remembers
 * the query that just found something (`remember`); on the start page it also
 * lists them (`show`). Nothing is sent to the server, and everything works
 * without it: when storage is unavailable the list is simply empty.
 */
export function RecentSearches({
  remember,
  show,
  labels,
}: {
  remember?: string;
  show?: boolean;
  labels: {
    title: string;
    note: string;
    clear: string;
    cleared: string;
  };
}) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const items = useMemo(() => parseRecentSearches(raw), [raw]);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!remember) return;
    const next = addRecentSearch(parseRecentSearches(readRaw()), remember);
    const serialised = JSON.stringify(next);
    if (serialised !== readRaw()) writeRaw(serialised);
  }, [remember]);

  if (!show) return null;
  if (items.length === 0) {
    return cleared ? (
      <p role="status" className={styles.meta}>
        {labels.cleared}
      </p>
    ) : null;
  }

  return (
    <section aria-labelledby="recent-searches-title">
      <h2 id="recent-searches-title">{labels.title}</h2>
      <>
        <ul className={styles.chips}>
          {items.map((item) => (
            <li key={item}>
              <Link
                className={styles.chip}
                href={searchHref({ q: item }) as Route}
              >
                {item}
              </Link>
            </li>
          ))}
        </ul>
        <p className={styles.recent}>
          <span className={styles.meta}>{labels.note}</span>
          <button
            type="button"
            className={styles.recentClear}
            onClick={() => {
              writeRaw(null);
              setCleared(true);
            }}
          >
            {labels.clear}
          </button>
        </p>
      </>
    </section>
  );
}
