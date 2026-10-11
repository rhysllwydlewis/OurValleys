import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import {
  directoryHref,
  paginationWindow,
  type DirectoryFilters,
} from "@/modules/businesses/directory-filters";
import styles from "./directory.module.css";

export function DirectoryPagination({
  t,
  filters,
  page,
  totalPages,
}: {
  t: Translator;
  filters: DirectoryFilters;
  page: number;
  totalPages: number;
}) {
  const pages = paginationWindow(page, totalPages);
  if (pages.length === 0) return null;
  const hrefFor = (target: number) =>
    directoryHref({ ...filters, page: target }) as Route;
  return (
    <nav className={styles.pagination} aria-label={t("dir.pagesAria")}>
      {page > 1 ? (
        <Link className="button" rel="prev" href={hrefFor(page - 1)}>
          {t("dir.previous")}
        </Link>
      ) : null}
      <ol className={styles.pageList}>
        {pages.map((entry, index) =>
          entry === null ? (
            <li key={`gap-${index}`} aria-hidden="true">
              …
            </li>
          ) : entry === page ? (
            <li key={entry}>
              <span
                className={styles.pageCurrent}
                aria-current="page"
                aria-label={t("dirx.pageCurrent", { page: entry })}
              >
                {entry}
              </span>
            </li>
          ) : (
            <li key={entry}>
              <Link
                className={styles.pageLink}
                href={hrefFor(entry)}
                aria-label={t("dirx.pageNumber", { page: entry })}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < totalPages ? (
        <Link className="button primary" rel="next" href={hrefFor(page + 1)}>
          {t("dir.next")}
        </Link>
      ) : null}
    </nav>
  );
}
