import Link from "next/link";
import type { Route } from "next";
import directory from "@/components/directory/directory.module.css";
import type { Translator } from "@/lib/i18n/translate";
import { paginationWindow } from "@/modules/businesses/directory-filters";
import { searchHref, type SearchState } from "@/modules/search/search-filters";

/** Numbered paging for one open tab; every link keeps the query and tab. */
export function SearchPagination({
  t,
  state,
  totalPages,
}: {
  t: Translator;
  state: SearchState;
  totalPages: number;
}) {
  const pages = paginationWindow(state.page, totalPages);
  if (pages.length === 0) return null;
  const hrefFor = (page: number) => searchHref({ ...state, page }) as Route;
  return (
    <nav className={directory.pagination} aria-label={t("searchx.pagesAria")}>
      {state.page > 1 ? (
        <Link className="button" rel="prev" href={hrefFor(state.page - 1)}>
          {t("dir.previous")}
        </Link>
      ) : null}
      <ol className={directory.pageList}>
        {pages.map((entry, index) =>
          entry === null ? (
            <li key={`gap-${index}`} aria-hidden="true">
              …
            </li>
          ) : entry === state.page ? (
            <li key={entry}>
              <span className={directory.pageCurrent} aria-current="page">
                <span className="sr-only">
                  {t("dirx.pageCurrent", { page: entry })}
                </span>
                <span aria-hidden="true">{entry}</span>
              </span>
            </li>
          ) : (
            <li key={entry}>
              <Link
                className={directory.pageLink}
                href={hrefFor(entry)}
                aria-label={t("dirx.pageNumber", { page: entry })}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
      </ol>
      {state.page < totalPages ? (
        <Link
          className="button primary"
          rel="next"
          href={hrefFor(state.page + 1)}
        >
          {t("dir.next")}
        </Link>
      ) : null}
    </nav>
  );
}
