import type { Locale } from "./config";
import { cy } from "./messages/cy";
import { en, type MessageKey } from "./messages/en";

export type { MessageKey };
export type MessageParams = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: MessageParams) => string;

const catalogues: Record<Locale, Record<MessageKey, string>> = { en, cy };

export function getMessages(locale: Locale): Record<MessageKey, string> {
  return catalogues[locale];
}

export function createTranslator(
  messages: Record<MessageKey, string>,
): Translator {
  return (key, params) => {
    const template = messages[key] ?? en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };
}

export function translatorFor(locale: Locale): Translator {
  return createTranslator(getMessages(locale));
}
