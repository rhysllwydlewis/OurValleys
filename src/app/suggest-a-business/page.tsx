import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SuggestionForm } from "./suggestion-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Suggest a local business",
  description:
    "Tell OurValleys about a local business that is missing from the directory.",
};

export default async function SuggestBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const initialName = typeof q === "string" ? q.trim().slice(0, 120) : "";

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell">
        <nav className="business-breadcrumb" aria-label="Breadcrumb">
          <Link href="/businesses">
            <span aria-hidden="true">← </span>
            Browse businesses
          </Link>
        </nav>
        <section className="business-section" aria-labelledby="suggest-title">
          <p className="eyebrow">Can&apos;t find it?</p>
          <h1 id="suggest-title">Suggest a local business</h1>
          <p className="lead">
            Tell us about a business that should be listed. Suggestions go to an
            OurValleys reviewer only: nothing is published automatically and we
            do not contact the business in your name. Suggestions and any email
            you give are deleted after twelve months. See the{" "}
            <Link href="/policies/privacy">privacy notice</Link>.
          </p>
          <SuggestionForm initialName={initialName} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
