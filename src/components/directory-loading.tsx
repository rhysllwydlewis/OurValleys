import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";

type LoadingKind =
  "places" | "businesses" | "offers" | "categories" | "events" | "guides";

/** The shared loading state of the public directory routes, in the reader's language. */
export async function DirectoryLoading({
  kind,
}: {
  kind: LoadingKind | "news" | "policies";
}) {
  const { locale, t } = await getTranslator();
  const key = (part: "eyebrow" | "title" | "hint") =>
    (kind === "news" || kind === "policies"
      ? `${kind}.loading${part[0]?.toUpperCase()}${part.slice(1)}`
      : `loading.${kind}.${part}`) as MessageKey;

  return (
    <>
      <SiteHeader />
      <main
        className="directory-shell"
        aria-busy="true"
        aria-live="polite"
        lang={LOCALE_DETAILS[locale].htmlLang}
      >
        <section className="directory-intro">
          <p className="eyebrow">{t(key("eyebrow"))}</p>
          <h1>{t(key("title"))}</h1>
        </section>
        <div className="skeleton-card" aria-hidden="true" />
        <span className="sr-only">{t(key("hint"))}</span>
      </main>
    </>
  );
}
