import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import directory from "@/components/directory/directory.module.css";
import type { SearchTab } from "@/modules/search/search-filters";

const labelKeys = {
  all: "searchx.tabAll",
  businesses: "searchx.tabBusinesses",
  offers: "searchx.tabOffers",
  events: "searchx.tabEvents",
  places: "searchx.tabPlaces",
  categories: "searchx.tabCategories",
  guides: "searchx.tabGuides",
} as const;

/** The result-type rail. Plain links, so it works without JavaScript. */
export function SearchTabs({ t, tabs }: { t: Translator; tabs: SearchTab[] }) {
  if (
    tabs.length <= 2 &&
    tabs.every((tab) => tab.type === "all" || tab.current)
  )
    return null;
  return (
    <nav className={directory.rail} aria-label={t("searchx.tabsAria")}>
      {tabs.map((tab) => (
        <Link
          key={tab.type}
          className={directory.pill}
          href={tab.href as Route}
          aria-current={tab.current ? "true" : undefined}
        >
          {t(labelKeys[tab.type])}
          <span className={directory.pillCount}>{tab.count}</span>
        </Link>
      ))}
    </nav>
  );
}
