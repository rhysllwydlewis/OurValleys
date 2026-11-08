/**
 * The catalogue-free half of the translator. Client components import this
 * (through `client.tsx`) so the browser bundle never contains a message
 * catalogue: the strings reach the browser as one long-cached asset instead
 * (see `catalogue-asset.ts`).
 */
import type { MessageKey } from "./messages/en";

export type { MessageKey };
export type MessageParams = Record<string, string | number>;
export type Translator = (key: MessageKey, params?: MessageParams) => string;
export type MessageCatalogue = Readonly<Record<MessageKey, string>>;

export function createTranslator(
  messages: Readonly<Partial<Record<MessageKey, string>>>,
  fallback?: Readonly<Partial<Record<MessageKey, string>>>,
): Translator {
  return (key, params) => {
    const template = messages[key] ?? fallback?.[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  };
}
