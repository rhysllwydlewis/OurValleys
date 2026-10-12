import type { Route } from "next";
import Link from "next/link";
import type { Translator } from "@/lib/i18n/translate";
import {
  displayName,
  placeDirectoryHref,
  type PlaceArea,
  type PlaceDirectoryFilters,
  type PlaceNode,
  type PlaceTree,
} from "@/modules/reference-data/place-tree";
import styles from "./places.module.css";

export function businessCountLabel(t: Translator, count: number): string {
  if (count <= 0) return t("placesx.countBusinessNone");
  return count === 1
    ? t("placesx.countBusinessOne")
    : t("placesx.countBusinessMany", { count });
}

export function placeCountLabel(t: Translator, count: number): string {
  return count === 1
    ? t("placesx.countPlaceOne")
    : t("placesx.countPlaceMany", { count });
}

/** Search, council area and "only places with businesses": a plain GET form. */
export function PlaceSearchBar({
  t,
  filters,
  areas,
  welsh,
}: {
  t: Translator;
  filters: PlaceDirectoryFilters;
  areas: PlaceNode[];
  welsh: boolean;
}) {
  return (
    <form
      className={`${styles.search} ov-glass`}
      action="/places"
      method="get"
      role="search"
      aria-label={t("placesx.formAria")}
    >
      <div className="field">
        <label htmlFor="places-query">{t("placesx.queryLabel")}</label>
        <input
          id="places-query"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder={t("placesx.queryPlaceholder")}
          maxLength={60}
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor="places-area">{t("placesx.areaLabel")}</label>
        <select id="places-area" name="area" defaultValue={filters.area}>
          <option value="">{t("placesx.allAreas")}</option>
          {areas.map((area) => (
            <option key={area.id} value={area.slug}>
              {displayName(area, welsh)}
            </option>
          ))}
        </select>
      </div>
      <button className={`button primary ${styles.submit}`} type="submit">
        {t("placesx.submit")}
      </button>
      <label className={styles.activeToggle}>
        <input
          type="checkbox"
          name="active"
          value="1"
          defaultChecked={filters.active}
        />
        {t("placesx.activeOnly")}
      </label>
    </form>
  );
}

/** Quick council-area links; the chosen one is marked current. */
export function PlaceAreaRail({
  t,
  filters,
  areas,
  welsh,
}: {
  t: Translator;
  filters: PlaceDirectoryFilters;
  areas: PlaceNode[];
  welsh: boolean;
}) {
  return (
    <nav aria-label={t("placesx.jumpAria")}>
      <ul className={styles.rail}>
        <li>
          <Link
            className="filter-chip"
            href={placeDirectoryHref({ ...filters, area: "" }) as Route}
            aria-current={filters.area ? undefined : "true"}
          >
            {t("placesx.allAreas")}
          </Link>
        </li>
        {areas.map((area) => (
          <li key={area.id}>
            <Link
              className="filter-chip"
              href={
                placeDirectoryHref({ ...filters, area: area.slug }) as Route
              }
              aria-current={filters.area === area.slug ? "true" : undefined}
            >
              {displayName(area, welsh)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Each active filter with a link that removes just that filter. */
export function PlaceFilterChips({
  t,
  filters,
  areaName,
}: {
  t: Translator;
  filters: PlaceDirectoryFilters;
  areaName: string | null;
}) {
  const chips: { label: string; removeLabel: string; href: string }[] = [];
  if (filters.q) {
    chips.push({
      label: t("placesx.chipSearch", { value: filters.q }),
      removeLabel: t("placesx.removeSearch", { value: filters.q }),
      href: placeDirectoryHref({ ...filters, q: "" }),
    });
  }
  if (filters.area && areaName) {
    chips.push({
      label: t("placesx.chipArea", { name: areaName }),
      removeLabel: t("placesx.removeArea", { name: areaName }),
      href: placeDirectoryHref({ ...filters, area: "" }),
    });
  }
  if (filters.active) {
    chips.push({
      label: t("placesx.chipActive"),
      removeLabel: t("placesx.removeActive"),
      href: placeDirectoryHref({ ...filters, active: false }),
    });
  }
  if (chips.length === 0) return null;
  return (
    <ul className={styles.chips} aria-label={t("placesx.filtersAria")}>
      {chips.map((chip) => (
        <li className={styles.chip} key={chip.href}>
          <span>{chip.label}</span>
          <Link href={chip.href as Route} aria-label={chip.removeLabel}>
            <span aria-hidden="true">×</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PlaceTile({
  t,
  node,
  count,
  welsh,
  context,
}: {
  t: Translator;
  node: PlaceNode;
  count: number;
  welsh: boolean;
  context?: string;
}) {
  const name = displayName(node, welsh);
  return (
    <li>
      <Link
        className={`${styles.tile} ${count === 0 ? styles.quiet : ""}`}
        href={`/places/${node.slug}` as Route}
      >
        <span className={styles.tileName}>
          <span>{name}</span>
          {context ? (
            <span className={styles.tileContext}>{context}</span>
          ) : null}
        </span>
        <span className={styles.count} aria-hidden="true">
          {count > 0 ? count : "–"}
        </span>
        <span className="sr-only">{businessCountLabel(t, count)}</span>
      </Link>
    </li>
  );
}

/**
 * One council area: its valleys and the places inside, each tile showing its
 * published business count. An area with no businesses yet starts collapsed
 * (a native disclosure, so it works without JavaScript) unless the visitor
 * has narrowed the page to it or a filter is on.
 */
export function PlaceAreaSection({
  t,
  tree,
  entry,
  welsh,
  expanded,
}: {
  t: Translator;
  tree: PlaceTree;
  entry: PlaceArea;
  welsh: boolean;
  expanded: boolean;
}) {
  const { area } = entry;
  const name = displayName(area, welsh);
  const meta = (
    <span className={styles.areaMeta}>
      <span>{placeCountLabel(t, entry.placeCount)}</span>
      <span>{businessCountLabel(t, entry.businessCount)}</span>
    </span>
  );
  const body = (
    <div className={styles.areaBody}>
      {entry.groups.map((group) => (
        <div key={group.heading?.id ?? "loose"}>
          <div className={styles.groupHead}>
            <h3>
              {group.heading ? (
                <Link
                  className="text-link"
                  href={`/places/${group.heading.slug}` as Route}
                >
                  {displayName(group.heading, welsh)}
                </Link>
              ) : (
                t("placesx.otherPlaces")
              )}
            </h3>
            {group.heading ? (
              <span className={styles.areaMeta}>
                {businessCountLabel(
                  t,
                  tree.totalCount.get(group.heading.id) ?? 0,
                )}
              </span>
            ) : null}
          </div>
          <ul className={styles.tiles}>
            {group.places.map((node) => (
              <PlaceTile
                key={node.id}
                t={t}
                node={node}
                count={tree.totalCount.get(node.id) ?? 0}
                welsh={welsh}
              />
            ))}
          </ul>
        </div>
      ))}
      <p>
        <Link className="text-link" href={`/places/${area.slug}` as Route}>
          {t("placesx.viewArea", { name })}
          <span aria-hidden="true"> →</span>
        </Link>
      </p>
    </div>
  );

  return (
    <details className={styles.area} open={expanded}>
      <summary>
        <h2 className={styles.areaTitle}>{name}</h2>
        {meta}
      </summary>
      {body}
    </details>
  );
}
