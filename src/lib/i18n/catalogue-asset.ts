import "server-only";
import { createHash } from "node:crypto";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { LOCALES, type Locale } from "./config";
import { cy } from "./messages/cy";
import { en } from "./messages/en";
import { CLIENT_MESSAGES_GLOBAL } from "./client-messages";

/**
 * The message catalogue as one immutable, long-cached script per language.
 *
 * Every page used to embed the whole catalogue for the visitor's language in
 * its HTML (about 300 KB, 80 KB compressed, on every navigation) and shipped
 * both catalogues again in a JavaScript chunk. Now the page carries a single
 * `<script src>` whose address contains a hash of its content, so a browser
 * downloads the strings once and every later page costs nothing.
 *
 * The same object is published on `globalThis` in the server process so
 * client components can render on the server without any payload.
 */
type Entry = {
  body: string;
  hash: string;
  gzip: Buffer;
  brotli: Buffer;
};

const catalogues: Record<Locale, Readonly<Record<string, string>>> = {
  // Welsh falls back to English for a key it lacks, as the server translator does.
  en,
  cy: { ...en, ...cy },
};

const entries = new Map<Locale, Entry>();

function entryFor(locale: Locale): Entry {
  const cached = entries.get(locale);
  if (cached) return cached;
  const body = `(globalThis.${CLIENT_MESSAGES_GLOBAL}=globalThis.${CLIENT_MESSAGES_GLOBAL}||{}).${locale}=${JSON.stringify(
    catalogues[locale],
  )};`;
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 12);
  // Compressed once per process: the platform's own compression does not apply
  // to route handler responses, and the catalogue is the largest script we send.
  const created = {
    body,
    hash,
    gzip: gzipSync(body, { level: 9 }),
    brotli: brotliCompressSync(body),
  };
  entries.set(locale, created);
  return created;
}

/** Make the catalogues readable by client components rendered on the server. */
export function publishServerMessages(): void {
  const target = globalThis as Record<string, unknown>;
  if (target[CLIENT_MESSAGES_GLOBAL]) return;
  target[CLIENT_MESSAGES_GLOBAL] = Object.fromEntries(
    LOCALES.map((locale) => [locale, catalogues[locale]]),
  );
}

export function catalogueAssetPath(locale: Locale): string {
  return `/i18n/${locale}.${entryFor(locale).hash}.js`;
}

/** Parse `cy.abc123def456.js`; anything else is not a catalogue address. */
export function parseCatalogueAsset(
  asset: string,
): { locale: Locale; hash: string } | null {
  const match = /^([a-z]{2})\.([0-9a-f]{12})\.js$/.exec(asset);
  if (!match) return null;
  const [, code, hash] = match;
  const locale = LOCALES.find((candidate) => candidate === code);
  return locale && hash ? { locale, hash } : null;
}

export function catalogueAssetBody(locale: Locale): Entry {
  return entryFor(locale);
}
