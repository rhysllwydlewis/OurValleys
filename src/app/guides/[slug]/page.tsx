import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicGuideBySlug } from "@/modules/guides/public";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getPublicGuideBySlug(slug);

  return {
    title: guide
      ? `${guide.title} | OurValleys`
      : "Guide not found | OurValleys",
    description: guide
      ? guide.summary
      : "The requested fictional representative guide is not available.",
    robots: { index: false, follow: false },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getPublicGuideBySlug(slug);
  if (!guide) notFound();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="guide-title">
          <p className="eyebrow">Fictional local guide preview</p>
          <h1 id="guide-title">{guide.title}</h1>
          <p className="lead">{guide.summary}</p>
          <div className="tag-row" aria-label="Guide details">
            <span className="tag">{guide.area}</span>
            <span className="tag">{guide.readingTime}</span>
            <span className="tag">Noindex preview</span>
          </div>
          <div className="actions">
            <Link className="button" href="/guides">
              Browse all guides
            </Link>
            <Link className="button primary" href="/businesses">
              Search live directory content
            </Link>
          </div>
        </section>

        <section aria-labelledby="guide-sections-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A connected discovery journey</p>
              <h2 id="guide-sections-title">Explore the guide concept</h2>
            </div>
            <p>Representative content only</p>
          </div>
          <div className="business-grid">
            {guide.sections.map((section, index) => (
              <article className="business-card" key={section.heading}>
                <div className="business-card__body">
                  <div className="tag-row">
                    <span className="tag">Step {index + 1}</span>
                  </div>
                  <h3>{section.heading}</h3>
                  <p>{section.body}</p>
                  <Link className="text-link" href={section.href as Route}>
                    {section.linkLabel}
                    <span aria-hidden="true"> →</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="state-panel" aria-labelledby="guide-warning-title">
          <p className="eyebrow">Before relying on a future guide</p>
          <h2 id="guide-warning-title">Editorial verification still matters.</h2>
          <p>
            This preview does not provide route safety, opening hours, access
            advice or endorsements. Future published guides must be sourced,
            dated, reviewed and connected to verified platform records.
          </p>
          <div className="actions">
            <Link className="button primary" href="/places">
              Explore provisional places
            </Link>
            <Link className="button" href="/events">
              Browse active event previews
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
