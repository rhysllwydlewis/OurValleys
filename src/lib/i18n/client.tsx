"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { localeUiCookieAssignment, type Locale } from "./config";
import {
  createTranslator,
  type MessageKey,
  type Translator,
} from "./translate";

type LocaleContextValue = { locale: Locale; t: Translator };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  chosen,
  children,
}: {
  locale: Locale;
  messages: Record<MessageKey, string>;
  /** The visitor's explicit language choice, if they made one. */
  chosen?: Locale;
  children: ReactNode;
}) {
  // Keep the script-readable copy (used by the global error page) in step with
  // an explicit choice, including choices made before the copy existed.
  useEffect(() => {
    if (!chosen) return;
    try {
      document.cookie = localeUiCookieAssignment(
        chosen,
        window.location.protocol === "https:",
      );
    } catch {
      // Cookies unavailable: the global error page falls back to the browser.
    }
  }, [chosen]);
  const value = useMemo(
    () => ({ locale, t: createTranslator(messages) }),
    [locale, messages],
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used inside <LocaleProvider>.");
  }
  return value;
}

export function useT(): Translator {
  return useLocale().t;
}
