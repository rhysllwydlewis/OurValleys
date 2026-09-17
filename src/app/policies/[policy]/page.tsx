import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicPageRobots } from "@/lib/release-stage";

const policies = {
  privacy: {
    title: "Privacy notice",
    summary:
      "How OurValleys handles account, business, enquiry and usage information.",
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
        "Your choices",
        "Account holders can update profile information, change optional marketing preferences and use the account closure process. Some records may be retained where security, dispute or legal obligations require it.",
      ],
    ],
  },
  terms: {
    title: "Platform terms",
    summary:
      "The baseline rules for using OurValleys accounts, discovery and business website tools.",
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
    title: "Accessibility statement",
    summary:
      "Our commitment to an inclusive, keyboard-friendly and understandable local platform.",
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
    title: "Content guidelines",
    summary:
      "What businesses, organisers and contributors may publish through OurValleys.",
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
    title: "Complaints and corrections",
    summary:
      "How to report inaccurate local information and challenge platform decisions.",
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
    title: "Advertising policy",
    summary:
      "How paid promotion must remain distinct from organic local discovery.",
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
  return {
    title: content.title,
    description: content.summary,
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

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="policy-title">
          <p className="eyebrow">OurValleys policies</p>
          <h1 id="policy-title">{content.title}</h1>
          <p className="lead">{content.summary}</p>
          <p>
            This baseline policy is part of the controlled launch-readiness
            system. Final public approval remains recorded through the release
            gate and does not replace specialist advice where required.
          </p>
        </section>
        <div className="policy-sections">
          {content.sections.map(([heading, body]) => (
            <section className="state-panel" key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
        </div>
        <p>
          <Link className="text-link" href="/policies">
            View all OurValleys policies →
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
