"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import styles from "./business-menu.module.css";

export type MenuFilterLabels = {
  legend: string;
  ariaLabel: string;
  hideUnavailable: string;
  clear: string;
  noMatch: string;
  /** Announced when the last filter is cleared. */
  cleared: string;
  /** Pre-formatted with `{shown}` and `{total}` placeholders. */
  count: string;
  countOne: string;
};

/**
 * Progressive enhancement for the public menu: the full menu is rendered on
 * the server and readable without scripts; with scripts the visitor can show
 * only dishes carrying every chosen dietary label. Filtering only toggles the
 * `hidden` attribute on server-rendered items, so nothing is ever fetched.
 */
export function MenuFilters({
  options,
  labels,
  hasUnavailable,
  children,
}: {
  options: Array<{ key: string; label: string }>;
  labels: MenuFilterLabels;
  hasUnavailable: boolean;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [hideUnavailable, setHideUnavailable] = useState(false);
  // True once hydrated, so the controls never appear where they cannot work.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const root = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const noMatchRef = useRef<HTMLParagraphElement>(null);
  const legendId = useId();

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const items = element.querySelectorAll<HTMLElement>("[data-menu-item]");
    let visibleCount = 0;
    let totalCount = 0;
    for (const item of items) {
      const diet = (item.dataset.diet ?? "").split(" ").filter(Boolean);
      const matches =
        selected.every((key) => diet.includes(key)) &&
        !(hideUnavailable && item.dataset.available === "false");
      item.hidden = !matches;
      if (item.dataset.menuDuplicate !== "true") {
        totalCount += 1;
        if (matches) visibleCount += 1;
      }
    }
    for (const group of element.querySelectorAll<HTMLElement>(
      "[data-menu-group]",
    )) {
      group.hidden = !group.querySelector("[data-menu-item]:not([hidden])");
    }
    for (const strip of element.querySelectorAll<HTMLElement>(
      "[data-menu-favourites]",
    )) {
      strip.hidden = !strip.querySelector("[data-menu-item]:not([hidden])");
    }
    for (const link of element.querySelectorAll<HTMLElement>(
      "[data-menu-jump]",
    )) {
      const target = element.querySelector<HTMLElement>(
        `#${link.dataset.menuJump}`,
      );
      link.hidden = Boolean(target?.hidden);
    }
    const active = selected.length > 0 || hideUnavailable;
    if (countRef.current) {
      countRef.current.textContent = active
        ? (visibleCount === 1 ? labels.countOne : labels.count)
            .replace("{shown}", String(visibleCount))
            .replace("{total}", String(totalCount))
        : labels.cleared;
    }
    if (noMatchRef.current) {
      noMatchRef.current.hidden = !(active && visibleCount === 0);
    }
  }, [selected, hideUnavailable, labels.count, labels.countOne]);

  const filtering = selected.length > 0 || hideUnavailable;
  const toggle = (key: string) =>
    setSelected((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key],
    );

  return (
    <div ref={root}>
      {mounted && (options.length > 0 || hasUnavailable) ? (
        <fieldset className={styles.filters} aria-labelledby={legendId}>
          <legend id={legendId} className={styles.filtersLegend}>
            {labels.legend}
          </legend>
          <div className={styles.filterChips}>
            {options.map((option) => {
              const on = selected.includes(option.key);
              return (
                <button
                  key={option.key}
                  type="button"
                  className={styles.filterChip}
                  aria-pressed={on}
                  onClick={() => toggle(option.key)}
                >
                  {option.label}
                </button>
              );
            })}
            {hasUnavailable ? (
              <button
                type="button"
                className={styles.filterChip}
                aria-pressed={hideUnavailable}
                onClick={() => setHideUnavailable((value) => !value)}
              >
                {labels.hideUnavailable}
              </button>
            ) : null}
            <button
              type="button"
              className={styles.filterClear}
              disabled={!filtering}
              onClick={() => {
                setSelected([]);
                setHideUnavailable(false);
              }}
            >
              {labels.clear}
            </button>
          </div>
          <p
            ref={countRef}
            className={styles.filterCount}
            role="status"
            aria-live="polite"
          />
        </fieldset>
      ) : null}
      {children}
      <p ref={noMatchRef} className={styles.noMatch} role="status" hidden>
        {labels.noMatch}
      </p>
    </div>
  );
}
