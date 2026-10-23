import type { Route } from "next";

/** Longest name the suggestion form accepts, mirrored by the page that reads `?q=`. */
const MAX_NAME_LENGTH = 120;

/** Link to the suggestion form, carrying what the visitor searched for as the business name. */
export function suggestBusinessHref(query?: string | null): Route {
  const name = (query ?? "").trim().slice(0, MAX_NAME_LENGTH);
  return (
    name
      ? `/suggest-a-business?q=${encodeURIComponent(name)}`
      : "/suggest-a-business"
  ) as Route;
}
