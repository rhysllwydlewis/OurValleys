import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

export default async function BusinessNotFound() {
  const { locale, t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main
        className="business-site-shell"
        lang={LOCALE_DETAILS[locale].htmlLang}
      >
        <section className="state-panel">
          <p className="eyebrow">{t("site.page.notFoundEyebrow")}</p>
          <h1>{t("site.page.notFoundTitle")}</h1>
          <p>{t("site.page.notFoundBody")}</p>
          <Link className="button primary" href="/businesses">
            {t("site.page.browsePublished")}
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
