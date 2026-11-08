"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { readClientMessages } from "./client-messages";
import { localeUiCookieAssignment, type Locale } from "./config";
import {
  createTranslator,
  type MessageCatalogue,
  type Translator,
} from "./translator";

type LocaleContextValue = { locale: Locale; t: Translator };

const NO_MESSAGES: MessageCatalogue = {} as MessageCatalogue;

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  chosen,
  children,
}: {
  locale: Locale;
  /**
   * Strings to use instead of the shared catalogue (error boundaries and
   * tests). Pages leave this out: the strings come from the catalogue script.
   */
  messages?: MessageCatalogue;
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
  const shared = messages ?? readClientMessages(locale);
  // After a language switch the new language's script may arrive a moment
  // after the new page. Keep the previous language on screen, wait for the
  // script, and reload only if it never comes (a blocked script, an old tab);
  // the choice is already stored, so the reload shows the right language.
  const [lastCatalogue, setLastCatalogue] = useState(shared);
  if (shared && shared !== lastCatalogue) setLastCatalogue(shared);
  const missing = !shared;
  useEffect(() => {
    if (!missing) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const arrived = readClientMessages(locale);
      if (arrived) {
        window.clearInterval(timer);
        setLastCatalogue(arrived);
      } else if (Date.now() - started > 3000) {
        window.clearInterval(timer);
        reloadOnce();
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [missing, locale]);
  const catalogue = shared ?? lastCatalogue ?? NO_MESSAGES;
  const value = useMemo(
    () => ({ locale, t: createTranslator(catalogue) }),
    [locale, catalogue],
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

/** Reload, but never twice in a row: a blocked script must not cause a loop. */
function reloadOnce() {
  try {
    const key = "ourvalleys-catalogue-reload";
    const last = Number(window.sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 10_000) return;
    window.sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
}
