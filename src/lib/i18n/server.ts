import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import {
  isLocale,
  LOCALE_COOKIE,
  negotiateLocale,
  type Locale,
} from "./config";
import { translatorFor, type Translator } from "./translate";

/** The visitor's language for this request: chosen cookie, then browser. */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return negotiateLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerStore.get("accept-language"),
  });
});

export async function getTranslator(): Promise<{
  locale: Locale;
  t: Translator;
}> {
  const locale = await getLocale();
  return { locale, t: translatorFor(locale) };
}

/** The language the visitor explicitly chose (cookie), or undefined if none. */
export const getChosenLocale = cache(async (): Promise<Locale | undefined> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : undefined;
});
