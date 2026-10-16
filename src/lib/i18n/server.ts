import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import {
  isLocale,
  LOCALE_COOKIE,
  negotiateLocale,
  type Locale,
} from "./config";
import { getAuth } from "@/lib/auth";
import { readSavedLocale } from "@/modules/residents/locale-preference";
import { translatorFor, type Translator } from "./translate";

/** The visitor's language for this request: chosen cookie, then browser. */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const cookie = cookieStore.get(LOCALE_COOKIE)?.value;
  return negotiateLocale({
    cookie: isLocale(cookie) ? cookie : await savedLocaleForSession(),
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

/**
 * With no language cookie (a new device), a signed-in resident's saved choice
 * wins over the browser default. Only looked up when a session cookie exists,
 * so anonymous traffic never pays for it.
 */
async function savedLocaleForSession(): Promise<Locale | undefined> {
  try {
    const cookieStore = await cookies();
    if (!cookieStore.getAll().some((c) => c.name.endsWith("session_token"))) {
      return undefined;
    }
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    return session?.user.id
      ? await readSavedLocale(session.user.id)
      : undefined;
  } catch {
    return undefined;
  }
}
