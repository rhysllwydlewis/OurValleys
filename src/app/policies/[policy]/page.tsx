import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { getPublicPageRobots } from "@/lib/release-stage";

const policies = {
  privacy: {
    sections: [
      [
        "What we collect",
        "Account details, information supplied by businesses, saved-item choices, enquiries, security records and privacy-conscious usage events needed to operate the service.",
      ],
      [
        "Why we use it",
        "To provide accounts and generated websites, deliver enquiries, protect the platform, respond to corrections and understand whether local discovery creates useful connections.",
      ],
      [
        "Public and private information",
        "Business owners control structured public business content. Private addresses, evidence, account records and administrative notes are not published through public projections.",
      ],
      [
        "Business suggestions",
        "If you suggest a missing business we store the details you give, and your email address if you choose to add one, in a private record seen only by OurValleys reviewers. We do not publish it or contact the business in your name, and we delete suggestions after twelve months.",
      ],
      [
        "Your choices",
        "Account holders can update profile information, change optional marketing preferences and use the account closure process. Some records may be retained where security, dispute or legal obligations require it.",
      ],
    ],
  },
  terms: {
    sections: [
      [
        "Accurate information",
        "Users must provide information they are entitled to publish and keep business, event and contact details reasonably accurate.",
      ],
      [
        "Safe use",
        "Do not use OurValleys for unlawful content, impersonation, harassment, fraud, malicious code, bulk scraping or attempts to bypass account and business permissions.",
      ],
      [
        "Business websites",
        "Generated websites are built from structured fields and approved presentation controls. OurValleys does not permit arbitrary scripts or unrestricted HTML.",
      ],
      [
        "Changes and suspension",
        "Content or access may be restricted where information is unsafe, misleading, disputed, unlawful or creates a material security risk. Important decisions should be recorded and reviewable.",
      ],
    ],
  },
  accessibility: {
    sections: [
      [
        "Our approach",
        "Core journeys are designed for keyboard access, visible focus, responsive layouts, reduced motion, semantic headings and clear error or recovery states.",
      ],
      [
        "Known limits",
        "Some third-party publisher content and business-supplied media may have limitations outside OurValleys' direct control. We still require useful text alternatives and safe fallbacks where proportionate.",
      ],
      [
        "Tell us about a problem",
        "Report the page, device, browser and the task you were trying to complete. Accessibility reports should be prioritised separately from ordinary design preferences.",
      ],
    ],
  },
  "content-guidelines": {
    sections: [
      [
        "Useful and specific",
        "Content should help a resident understand what is offered, where it is available, how to make contact and whether important restrictions apply.",
      ],
      [
        "No unsupported claims",
        "Do not claim verification, awards, popularity, availability, qualifications or endorsements without an appropriate basis.",
      ],
      [
        "Rights and consent",
        "Only upload text and media you own, are licensed to use or have permission to publish. Personal information about another person requires an appropriate reason and authority.",
      ],
      [
        "Prohibited content",
        "Unlawful, threatening, discriminatory, sexually exploitative, fraudulent, malicious or deliberately deceptive content is not permitted.",
      ],
    ],
  },
  corrections: {
    sections: [
      [
        "Incorrect business information",
        "Use the report control on the relevant business page where available. A report does not overwrite business information automatically; it creates a reviewable correction record.",
      ],
      [
        "Editorial corrections",
        "Identify the page, statement and evidence supporting the requested correction. Material corrections should be recorded rather than silently disguised.",
      ],
      [
        "Account or moderation decisions",
        "Provide the relevant reference and explain the outcome requested. Appeals should be reviewed by someone able to reconsider the original evidence and decision.",
      ],
      [
        "Urgent risk",
        "Do not use an ordinary correction form for an immediate threat to life or safety. Contact the appropriate emergency service first.",
      ],
    ],
  },
  advertising: {
    sections: [
      [
        "Clear labels",
        "Paid placements, sponsorship and commercial partnerships must be labelled so a reasonable user can distinguish them from organic results and editorial selections.",
      ],
      [
        "No hidden pay-to-rank",
        "Payment must not secretly alter organic search ranking. Sponsored inventory should use a separate, documented placement rule.",
      ],
      [
        "Eligibility",
        "Advertising must comply with the content guidelines and must not imply verification or endorsement by OurValleys.",
      ],
      [
        "Measurement",
        "Commercial reporting should use proportionate, privacy-conscious events and should not require unnecessary personal profiling.",
      ],
    ],
  },
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
              <p>{body}</p>
            </section>
          ))}
        </div>
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
