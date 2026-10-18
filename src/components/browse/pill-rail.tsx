import Link from "next/link";
import type { Route } from "next";
import styles from "./browse.module.css";

export type PillRailItem = {
  key: string;
  label: string;
  /** Shown after the label; `null` leaves it out. */
  count: number | null;
  href: string;
  current: boolean;
  /** Spoken in place of "label count" when set. */
  ariaLabel?: string;
};

/** A sideways-scrolling row of filter pills. The current one is marked with `aria-current`. */
export function PillRail({
  label,
  items,
}: {
  label: string;
  items: PillRailItem[];
}) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label}>
      <ul className={styles.rail}>
        {items.map((item) => (
          <li key={item.key}>
            <Link
              className={styles.pill}
              href={item.href as Route}
              aria-current={item.current ? "true" : undefined}
              aria-label={item.ariaLabel}
            >
              {item.label}
              {item.count !== null ? (
                <span
                  className={styles.pillCount}
                  aria-hidden={item.ariaLabel ? "true" : undefined}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
