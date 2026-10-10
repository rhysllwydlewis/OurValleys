import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { getPublicPageRobots } from "@/lib/release-stage";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("policies.metaTitle"),
    description: t("policies.metaDescription"),
    robots: getPublicPageRobots(),
  };
}

const policyLinks = [
  ["policies.privacy", "/policies/privacy"],
  ["policies.terms", "/policies/terms"],
  ["policies.accessibility", "/policies/accessibility"],
  ["policies.contentGuidelines", "/policies/content-guidelines"],
  ["policies.corrections", "/policies/corrections"],
  ["policies.advertising", "/policies/advertising"],
] as const satisfies readonly (readonly [MessageKey, string])[];

export default async function PoliciesPage() {
  const { locale, t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main className="directory-shell" lang={LOCALE_DETAILS[locale].htmlLang}>
        <section className="directory-intro" aria-labelledby="policies-title">
          <p className="eyebrow">{t("policies.eyebrow")}</p>
          <h1 id="policies-title">{t("policies.title")}</h1>
          <p className="lead">{t("policies.lead")}</p>
        </section>
        <section className="business-grid" aria-label={t("policies.listLabel")}>
          {policyLinks.map(([labelKey, href]) => (
            <article className="business-card business-card--simple" key={href}>
              <div className="business-card__body">
                <h2>{t(labelKey)}</h2>
                <Link className="text-link" href={href}>
                  {t("policies.read")} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
