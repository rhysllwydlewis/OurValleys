import { NearMeButton } from "./near-me-button";
import type { PlaceCentroid } from "@/modules/businesses/near-me";
import { SearchSuggestInput } from "@/components/search-suggest-input";
import type { Translator } from "@/lib/i18n/translate";
import {
  DIRECTORY_FLAG_FILTERS,
  RADIUS_OPTIONS_KM,
  countAdvancedFilters,
  type DirectoryFilters,
  type DirectoryFlagKey,
} from "@/modules/businesses/directory-filters";
import styles from "./directory.module.css";

type Option = { id: string; slug: string; name: string };

const flagLabelKeys = {
  openNow: "dir.openNow",
  verified: "dir.verifiedOnly",
  accessible: "dir.stepFree",
  welshSpeaking: "dir.welshSpeaking",
  delivery: "dir.delivery",
  collection: "dir.collection",
  emergency: "dir.emergency",
  hearingLoop: "dir.hearingLoop",
  accessibleToilet: "dir.accessibleToilet",
  appointmentRequired: "dir.appointmentRequired",
} as const satisfies Record<DirectoryFlagKey, string>;

/**
 * The directory search bar: what, category and place always visible, the rest
 * in a native disclosure that works without JavaScript and opens by itself
 * when one of its filters is active. Submitting is an ordinary GET.
 */
export function DirectorySearch({
  t,
  filters,
  categories,
  places,
  centroids = [],
}: {
  t: Translator;
  filters: DirectoryFilters;
  categories: Option[];
  places: Option[];
  /** Public place centres for the "Near me" button; empty hides it. */
  centroids?: PlaceCentroid[];
}) {
  const advancedCount = countAdvancedFilters(filters);
  const selectedCategory = categories.some((o) => o.slug === filters.category)
    ? filters.category
    : "";
  const selectedPlace = places.some((o) => o.slug === filters.place)
    ? filters.place
    : "";
  const selectedNear = places.some((o) => o.slug === filters.near)
    ? filters.near
    : "";

  return (
    <form
      className={`${styles.search} ov-glass`}
      action="/businesses"
      method="get"
      role="search"
      aria-label={t("dir.eyebrow")}
    >
      <div className={styles.searchMain}>
        <div className="field">
          <label htmlFor="business-query">{t("dir.queryLabel")}</label>
          <SearchSuggestInput
            id="business-query"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={t("dir.queryPlaceholder")}
            maxLength={80}
          />
        </div>
        <div className="field">
          <label htmlFor="business-category">{t("dir.categoryLabel")}</label>
          <select
            id="business-category"
            name="category"
            defaultValue={selectedCategory}
          >
            <option value="">{t("dir.allCategories")}</option>
            {categories.map((option) => (
              <option key={option.id} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="business-place">{t("dir.placeLabel")}</label>
          <select id="business-place" name="place" defaultValue={selectedPlace}>
            <option value="">{t("hero.allAreas")}</option>
            {places.map((option) => (
              <option key={option.id} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <button className={`button primary ${styles.submit}`} type="submit">
          {t("dir.submit")}
        </button>
      </div>

      <NearMeButton
        filters={filters}
        centroids={centroids}
        displayNames={Object.fromEntries(places.map((o) => [o.slug, o.name]))}
        labels={{
          button: t("dirx.nearMeButton"),
          locating: t("dirx.nearMeLocating"),
          found: t("dirx.nearMeFound", { place: "{place}" }),
          denied: t("dirx.nearMeDenied"),
          unsupported: t("dirx.nearMeUnsupported"),
          timeout: t("dirx.nearMeTimeout"),
          outside: t("dirx.nearMeOutside"),
        }}
      />

      <details className={styles.more} open={advancedCount > 0}>
        <summary>
          {advancedCount > 0
            ? t("dirx.moreFiltersCount", { count: advancedCount })
            : t("dirx.moreFilters")}
        </summary>
        <div className={styles.moreBody}>
          <fieldset className={styles.group}>
            <legend>{t("dirx.panelNear")}</legend>
            <p className={styles.hint}>{t("dirx.panelNearHint")}</p>
            <div className={styles.nearRow}>
              <div className="field">
                <label htmlFor="business-near">{t("dir.nearLabel")}</label>
                <select
                  // Keyed so a soft navigation (for example "Near me") shows the
                  // newly applied place instead of the previous uncontrolled value.
                  key={`near-${selectedNear}`}
                  id="business-near"
                  name="near"
                  defaultValue={selectedNear}
                >
                  <option value="">{t("dir.anyDistance")}</option>
                  {places.map((option) => (
                    <option key={option.id} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="business-radius">{t("dir.withinLabel")}</label>
                <select
                  key={`radius-${filters.radius}`}
                  id="business-radius"
                  name="radius"
                  defaultValue={String(filters.radius)}
                >
                  {RADIUS_OPTIONS_KM.map((option) => (
                    <option key={option} value={option}>
                      {option}km
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>
          <fieldset className={styles.group}>
            <legend>{t("dirx.panelGoodToKnow")}</legend>
            <div className={styles.toggles}>
              {DIRECTORY_FLAG_FILTERS.map(({ key, param }) => (
                <label
                  className={styles.toggle}
                  key={key}
                  htmlFor={`business-${param}`}
                >
                  <input
                    id={`business-${param}`}
                    name={param}
                    type="checkbox"
                    value="1"
                    defaultChecked={filters[key]}
                  />
                  <span>{t(flagLabelKeys[key])}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </details>
      {filters.sort !== "relevance" ? (
        <input type="hidden" name="sort" value={filters.sort} />
      ) : null}
    </form>
  );
}
