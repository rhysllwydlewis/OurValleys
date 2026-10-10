import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";

type Copy = { eyebrow: MessageKey; title: MessageKey; hint: MessageKey };

const loadingCopy = {
  places: {
    eyebrow: "loading.places.eyebrow",
    title: "loading.places.title",
    hint: "loading.places.hint",
  },
  businesses: {
    eyebrow: "loading.businesses.eyebrow",
    title: "loading.businesses.title",
    hint: "loading.businesses.hint",
  },
  offers: {
    eyebrow: "loading.offers.eyebrow",
    title: "loading.offers.title",
    hint: "loading.offers.hint",
  },
  categories: {
    eyebrow: "loading.categories.eyebrow",
    title: "loading.categories.title",
    hint: "loading.categories.hint",
  },
  events: {
    eyebrow: "loading.events.eyebrow",
    title: "loading.events.title",
    hint: "loading.events.hint",
  },
  guides: {
    eyebrow: "loading.guides.eyebrow",
    title: "loading.guides.title",
    hint: "loading.guides.hint",
  },
  news: {
    eyebrow: "news.loadingEyebrow",
    title: "news.loadingTitle",
    hint: "news.loadingHint",
  },
  policies: {
    eyebrow: "policies.loadingEyebrow",
    title: "policies.loadingTitle",
    hint: "policies.loadingHint",
  },
} as const satisfies Record<string, Copy>;

/** The shared loading state of the public directory routes, in the reader's language. */
export async function DirectoryLoading({
  kind,
}: {
  kind: keyof typeof loadingCopy;
}) {
  const { locale, t } = await getTranslator();
  const copy = loadingCopy[kind];
  const lang = LOCALE_DETAILS[locale].htmlLang;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell" aria-busy="true" aria-live="polite">
        <section className="directory-intro" lang={lang}>
          <p className="eyebrow">{t(copy.eyebrow)}</p>
          <h1>{t(copy.title)}</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only" lang={lang}>
          {t(copy.hint)}
        </span>
      </main>
    </>
  );
}
