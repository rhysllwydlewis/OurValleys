import type { Route } from "next";

/** Longest name the suggestion form accepts, mirrored by the page that reads `?q=`. */
const MAX_NAME_LENGTH = 120;

/** Longest place text the suggestion form accepts, mirrored by the page that reads `?place=`. */
export const MAX_PLACE_LENGTH = 80;

/**
 * Link to the suggestion form, carrying what the visitor searched for as the
 * business name and, from a place page or map, the place name to pre-fill.
 */
export function suggestBusinessHref(
  query?: string | null,
  placeName?: string | null,
): Route {
  const params: string[] = [];
  const name = (query ?? "").trim().slice(0, MAX_NAME_LENGTH);
  const place = (placeName ?? "").trim().slice(0, MAX_PLACE_LENGTH);
  if (name) params.push(`q=${encodeURIComponent(name)}`);
  if (place) params.push(`place=${encodeURIComponent(place)}`);
  const search = params.join("&");
  return (
    search ? `/suggest-a-business?${search}` : "/suggest-a-business"
  ) as Route;
}
