import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import { paginationWindow } from "@/modules/businesses/directory-filters";
import { eventsHref, type EventFilters } from "@/modules/events/event-filters";
import styles from "./events.module.css";

export function EventsPagination({
  t,
  filters,
  page,
  totalPages,
}: {
  t: Translator;
  filters: EventFilters;
  page: number;
  totalPages: number;
}) {
  const pages = paginationWindow(page, totalPages);
  if (pages.length === 0) return null;
  const hrefFor = (target: number) =>
    eventsHref({ ...filters, page: target }) as Route;
  return (
    <nav className={styles.pagination} aria-label={t("events.pagesAria")}>
      {page > 1 ? (
        <Link className="button" rel="prev" href={hrefFor(page - 1)}>
          {t("events.previous")}
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
                  {t("eventsx.pageCurrent", { page: entry })}
                </span>
                <span aria-hidden="true">{entry}</span>
              </span>
            </li>
          ) : (
            <li key={entry}>
              <Link
                className={styles.pageLink}
                href={hrefFor(entry)}
                aria-label={t("eventsx.pageNumber", { page: entry })}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < totalPages ? (
        <Link className="button primary" rel="next" href={hrefFor(page + 1)}>
          {t("events.next")}
        </Link>
      ) : null}
    </nav>
  );
}
