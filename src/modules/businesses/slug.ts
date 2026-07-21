/**
 * Builds the human-readable business-name part of the public URL (docs/32
 * §6.1). Welsh diacritics (ŵ, ŷ, â, ê, î, ô, û and friends) are transliterated
 * rather than dropped so names remain recognisable.
 */
export function slugifyBusinessName(tradingName: string): string {
  return tradingName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
