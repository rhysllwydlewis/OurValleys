import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import type { SearchStart } from "@/modules/search/site-search";
import { RecentSearches } from "./recent-searches";
import styles from "./search.module.css";

/**
 * What the page offers before anything is typed: the visitor's own recent
 * searches, then categories and towns that really have published businesses
 * and a few quick routes, so every starting point leads somewhere.
 */
export function SearchStartPanel({
  t,
  start,
  welsh,
}: {
  t: Translator;
  start: SearchStart;
  welsh: boolean;
}) {
  const quick = [
    { href: "/businesses?openNow=1", label: t("searchx.quickOpenNow") },
    { href: "/offers", label: t("searchx.quickOffers") },
    { href: "/events", label: t("searchx.quickEvents") },
    { href: "/map", label: t("searchx.quickMap") },
  ];
  return (
    <div className={styles.start}>
      <div>
        <p className="eyebrow">{t("searchx.startEyebrow")}</p>
        <p className={styles.startTitle}>{t("searchx.startTitle")}</p>
      </div>
      <RecentSearches
        show
        labels={{
          title: t("searchx.recentTitle"),
          note: t("searchx.recentNote"),
          clear: t("searchx.recentClear"),
          cleared: t("searchx.recentCleared"),
        }}
      />
      {start.categories.length > 0 ? (
        <section aria-labelledby="start-categories-title">
          <h2 id="start-categories-title">{t("searchx.startCategories")}</h2>
          <ul className={styles.chips}>
            {start.categories.map((category) => (
              <li key={category.slug}>
                <Link
                  className={styles.chip}
                  href={
                    `/businesses?category=${encodeURIComponent(category.slug)}` as Route
                  }
                >
                  {(welsh && category.welshLabel) || category.name}
                  <span className={styles.chipCount}>{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {start.places.length > 0 ? (
        <section aria-labelledby="start-places-title">
          <h2 id="start-places-title">{t("searchx.startPlaces")}</h2>
          <ul className={styles.chips}>
            {start.places.map((place) => (
              <li key={place.slug}>
                <Link
                  className={styles.chip}
                  href={`/places/${encodeURIComponent(place.slug)}` as Route}
                >
                  {(welsh && place.welshName) || place.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="start-quick-title">
        <h2 id="start-quick-title">{t("searchx.startQuick")}</h2>
        <ul className={styles.chips}>
          {quick.map((item) => (
            <li key={item.href}>
              <Link className={styles.chip} href={item.href as Route}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
