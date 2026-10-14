import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import { paginationWindow } from "@/modules/businesses/directory-filters";
import styles from "./browse.module.css";

/** Numbered paging for any browse page; `hrefFor` keeps that page's filters. */
export function NumberedPagination({
  t,
  page,
  totalPages,
  hrefFor,
}: {
  t: Translator;
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  const pages = paginationWindow(page, totalPages);
  if (pages.length === 0) return null;
  return (
    <nav className={styles.pagination} aria-label={t("dir.pagesAria")}>
      {page > 1 ? (
        <Link
          className="button"
          rel="prev"
          href={hrefFor(page - 1) as Route}
        >
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
              <span className={styles.pageCurrent} aria-current="page">
                <span className="sr-only">
                  {t("dirx.pageCurrent", { page: entry })}
                </span>
                <span aria-hidden="true">{entry}</span>
              </span>
            </li>
          ) : (
            <li key={entry}>
              <Link
                className={styles.pageLink}
                href={hrefFor(entry) as Route}
                aria-label={t("dirx.pageNumber", { page: entry })}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < totalPages ? (
        <Link
          className="button primary"
          rel="next"
          href={hrefFor(page + 1) as Route}
        >
          {t("dir.next")}
        </Link>
      ) : null}
    </nav>
  );
}
