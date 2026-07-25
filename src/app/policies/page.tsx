import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicPageRobots } from "@/lib/release-stage";

export const metadata: Metadata = {
  title: "Policies | OurValleys",
  description:
    "Privacy, accessibility, content, corrections, advertising and platform rules for OurValleys.",
  robots: getPublicPageRobots(),
};

const policyLinks = [
  ["Privacy notice", "/policies/privacy"],
  ["Platform terms", "/policies/terms"],
  ["Accessibility statement", "/policies/accessibility"],
  ["Content guidelines", "/policies/content-guidelines"],
  ["Complaints and corrections", "/policies/corrections"],
  ["Advertising policy", "/policies/advertising"],
] as const;

export default function PoliciesPage() {
  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="policies-title">
          <p className="eyebrow">Trust and accountability</p>
          <h1 id="policies-title">OurValleys policies.</h1>
          <p className="lead">
            Plain-language rules for how the platform handles information,
            accessibility, local content, complaints and commercial promotion.
          </p>
        </section>
        <section className="business-grid" aria-label="Policy documents">
          {policyLinks.map(([label, href]) => (
            <article className="business-card" key={href}>
              <div className="business-card__body">
                <h2>{label}</h2>
                <Link className="text-link" href={href}>
                  Read policy <span aria-hidden="true">→</span>
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
