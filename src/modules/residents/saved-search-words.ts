import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { translatorFor } from "@/lib/i18n/translate";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";
import {
  isFilterSetType,
  plainSavedQueryWords,
  savedQueryWords,
  type SavedQueryWords,
  type SavedSearchType,
} from "./saved-search-model";

/**
 * The words for describing these saved searches in `locale`. Place and
 * category names are only read when one of the searches is a kept filter set;
 * typed site searches are shown exactly as typed and need neither. Both name
 * lists come back empty when the database is unavailable, which leaves the
 * spaced-out slugs rather than failing the page.
 */
export async function loadSavedQueryWords(
  locale: Locale,
  searches: ReadonlyArray<{ type: SavedSearchType }>,
): Promise<SavedQueryWords> {
  if (!searches.some((item) => isFilterSetType(item.type))) {
    return plainSavedQueryWords;
  }
  const [places, categories] = await Promise.all([
    listActivePlaces(),
    listActiveCategories(),
  ]);
  return savedQueryWords(translatorFor(locale), { places, categories });
}
