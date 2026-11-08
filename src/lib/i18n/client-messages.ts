import type { Locale } from "./config";
import type { MessageCatalogue } from "./translator";

/** Where the catalogue script (or the server process) publishes strings. */
export const CLIENT_MESSAGES_GLOBAL = "__OURVALLEYS_MESSAGES__";

export function readClientMessages(locale: Locale): MessageCatalogue | null {
  const store = (globalThis as Record<string, unknown>)[
    CLIENT_MESSAGES_GLOBAL
  ] as Partial<Record<Locale, MessageCatalogue>> | undefined;
  return store?.[locale] ?? null;
}
