import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";
import { escapeLikePattern, foldText } from "./match";

/** Trigram similarity at or above this counts as a typo-tolerant match. */
export const FOLDED_SIMILARITY_THRESHOLD = 0.4;

/** Typo tolerance is for plain words; "50%" or "zz%x" must stay literal. */
const PLAIN_WORDS = /^[\p{L}\p{N}\s'’-]+$/u;

/**
 * Matches typed text against a column ignoring case and accents, like the
 * business directory search does, so "Cafe" finds "Café" and "Rhondda" finds
 * "Rhôndda". `fuzzy` also accepts near-misses ("bakry" for "Bakery") and
 * should only be set for short labels such as titles and names.
 */
export function foldedMatch(
  column: AnyColumn | SQL,
  query: string,
  options: { fuzzy?: boolean } = {},
): SQL {
  const folded = foldText(query);
  const pattern = `%${escapeLikePattern(folded)}%`;
  const expression = sql`lower(public.ourvalleys_unaccent(${column}::text))`;
  const contains = sql`${expression} like ${pattern}`;
  if (!options.fuzzy || !PLAIN_WORDS.test(folded)) return contains;
  return sql`(${contains} or similarity(${expression}, ${folded}) >= ${FOLDED_SIMILARITY_THRESHOLD})`;
}
