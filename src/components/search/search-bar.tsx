import { SearchSuggestInput } from "@/components/search-suggest-input";
import type { Translator } from "@/lib/i18n/translate";
import type { SearchType } from "@/modules/search/search-filters";
import styles from "./search.module.css";

/**
 * The search box with live suggestions. Without JavaScript it is an ordinary
 * GET form. Searching always starts again from "everything": the open tab is
 * deliberately not carried over to a different query.
 */
export function SearchBar({
  t,
  query,
}: {
  t: Translator;
  query: string;
  type?: SearchType;
}) {
  return (
    <form
      className={`${styles.bar} ov-glass`}
      action="/search"
      method="get"
      role="search"
      aria-label={t("search.formLabel")}
    >
      <div className="field">
        <label htmlFor="site-query">{t("search.queryLabel")}</label>
        <SearchSuggestInput
          id="site-query"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t("search.placeholder")}
          maxLength={80}
          required
          minLength={2}
        />
      </div>
      <button className="button primary" type="submit">
        {t("search.submit")}
      </button>
    </form>
  );
}
