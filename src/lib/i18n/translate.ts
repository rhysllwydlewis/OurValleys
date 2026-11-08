import type { Locale } from "./config";
import { cy } from "./messages/cy";
import { en, type MessageKey } from "./messages/en";

import {
  type MessageParams,
  type Translator,
  createTranslator as createCatalogueFreeTranslator,
} from "./translator";

export type { MessageKey, MessageParams, Translator };

const catalogues: Record<Locale, Record<MessageKey, string>> = { en, cy };

export function getMessages(locale: Locale): Record<MessageKey, string> {
  return catalogues[locale];
}

/** A translator over `messages`, falling back to English for a missing key. */
export function createTranslator(
  messages: Record<MessageKey, string>,
): Translator {
  return createCatalogueFreeTranslator(messages, en);
}

export function translatorFor(locale: Locale): Translator {
  return createTranslator(getMessages(locale));
}
