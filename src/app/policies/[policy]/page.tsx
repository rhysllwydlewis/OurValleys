import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import {
  accessibilitySections,
  advertisingSections,
  contentGuidelinesSections,
  correctionsSections,
  termsSections,
} from "@/lib/policy-documents";
import { privacyPolicySections } from "@/lib/privacy-policy";
import type { MessageKey } from "@/lib/i18n/translate";
import { getPublicPageRobots } from "@/lib/release-stage";

const policies = {
  privacy: { sections: privacyPolicySections },
  terms: { sections: termsSections },
  accessibility: { sections: accessibilitySections },
  "content-guidelines": { sections: contentGuidelinesSections },
  corrections: { sections: correctionsSections },
  advertising: { sections: advertisingSections },
} as const;

type PolicyKey = keyof typeof policies;

const policyTitleKeys: Record<PolicyKey, MessageKey> = {
  privacy: "policies.privacy",
  terms: "policies.terms",
  accessibility: "policies.accessibility",
  "content-guidelines": "policies.contentGuidelines",
  corrections: "policies.corrections",
  advertising: "policies.advertising",
};

const policySummaryKeys: Record<PolicyKey, MessageKey> = {
  privacy: "policies.summary.privacy",
  terms: "policies.summary.terms",
  accessibility: "policies.summary.accessibility",
  "content-guidelines": "policies.summary.content-guidelines",
  corrections: "policies.summary.corrections",
  advertising: "policies.summary.advertising",
};

export function generateStaticParams() {
  return Object.keys(policies).map((policy) => ({ policy }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ policy: string }>;
}): Promise<Metadata> {
  const { policy } = await params;
  const content = policies[policy as PolicyKey];
  if (!content) return {};
  const { t } = await getTranslator();
  return {
    title: t(policyTitleKeys[policy as PolicyKey]),
    description: t(policySummaryKeys[policy as PolicyKey]),
    robots: getPublicPageRobots(),
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy } = await params;
  const content = policies[policy as PolicyKey];
  if (!content) notFound();
  const { locale, t } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const key = policy as PolicyKey;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell" lang={lang}>
        <section className="directory-intro" aria-labelledby="policy-title">
          <p className="eyebrow">{t("policies.detailEyebrow")}</p>
          <h1 id="policy-title">{t(policyTitleKeys[key])}</h1>
          <p className="lead">{t(policySummaryKeys[key])}</p>
          <p>{t("policies.baselineNote")}</p>
          {locale === "cy" ? (
            <p role="note">{t("policies.englishOnlyNote")}</p>
          ) : null}
        </section>
        {/* The policy wording is English until a reviewed Welsh text exists. */}
        <div className="policy-sections" lang="en-GB">
          {content.sections.map(([heading, body]) => (
            <section className="state-panel" key={heading}>
              <h2>{heading}</h2>
              {body.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        {key === "accessibility" ? (
          <section className="state-panel">
            <h2>{t("display.title")}</h2>
            <p>{t("display.lead")}</p>
            <p>
              <Link className="text-link" href="/display">
                {t("display.link")} →
              </Link>
            </p>
          </section>
        ) : null}
        <p>
          <Link className="text-link" href="/policies">
            {t("policies.viewAll")} →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
