export const LOCALES = ["en", "cy"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ov-locale";
/**
 * A script-readable copy of the chosen language, for the global error boundary
 * (which has no provider). The real choice stays in the httpOnly cookie above.
 */
export const LOCALE_UI_COOKIE = "ov-locale-ui";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_DETAILS: Record<
  Locale,
  { htmlLang: string; openGraph: string; nativeName: string; shortName: string }
> = {
  en: {
    htmlLang: "en-GB",
    openGraph: "en_GB",
    nativeName: "English",
    shortName: "EN",
  },
  cy: {
    htmlLang: "cy-GB",
    openGraph: "cy_GB",
    nativeName: "Cymraeg",
    shortName: "CY",
  },
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Picks the first supported language from an Accept-Language header, honouring
 * quality values. Returns undefined when nothing supported is requested.
 */
export function parseAcceptLanguage(
  header: string | null | undefined,
): Locale | undefined {
  if (!header || header.length > 500) return undefined;

  const ranked = header
    .split(",")
    .map((part, position) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const quality = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return {
        primary: tag.trim().toLowerCase().split("-")[0] ?? "",
        quality: Number.isFinite(quality) ? quality : 0,
        position,
      };
    })
    .filter((entry) => entry.quality > 0 && isLocale(entry.primary))
    .sort((a, b) => b.quality - a.quality || a.position - b.position);

  const best = ranked[0];
  return best && isLocale(best.primary) ? best.primary : undefined;
}

/** An explicit visitor choice (cookie) beats the browser's language. */
export function negotiateLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  return parseAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}

/**
 * The language for the global error boundary, which replaces the whole layout
 * and cannot read the httpOnly cookie: the readable copy of the visitor's
 * choice first, then the browser's languages, then English.
 */
export function localeFromBrowser(
  cookieString: string,
  browserLanguages: readonly string[] = [],
): Locale {
  for (const part of cookieString.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === LOCALE_UI_COOKIE) {
      const value = rest.join("=");
      if (isLocale(value)) return value;
    }
  }
  return parseAcceptLanguage(browserLanguages.join(",")) ?? DEFAULT_LOCALE;
}
