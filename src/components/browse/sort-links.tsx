import Link from "next/link";
import type { Route } from "next";
import styles from "./browse.module.css";

export type SortLinkItem = {
  key: string;
  label: string;
  href: string;
  current: boolean;
};

export function SortLinks({
  label,
  items,
}: {
  label: string;
  items: SortLinkItem[];
}) {
  return (
    <nav aria-label={label}>
      <ul className={styles.sort}>
        <li className={styles.sortLabel} aria-hidden="true">
          {label}
        </li>
        {items.map((item) => (
          <li key={item.key}>
            {item.current ? (
              <span className={styles.sortCurrent} aria-current="true">
                {item.label}
              </span>
            ) : (
              <Link className={styles.sortLink} href={item.href as Route}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
