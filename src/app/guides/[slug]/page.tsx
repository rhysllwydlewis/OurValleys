import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicPageRobots } from "@/lib/release-stage";
import { getPublicGuideBySlug } from "@/modules/guides/public";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getPublicGuideBySlug(slug);

  return {
    title: guide ? guide.title : "Guide not found",
    description: guide
      ? guide.summary
      : "The requested guide is not available.",
    robots: guide ? getPublicPageRobots() : { index: false, follow: false },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = await getPublicGuideBySlug(slug);
  if (!guide) notFound();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="guide-title">
          <p className="eyebrow">Local guide</p>
          <h1 id="guide-title">{guide.title}</h1>
          <p className="lead">{guide.summary}</p>
          <div className="tag-row" aria-label="Guide details">
            <span className="tag">{guide.area}</span>
            <span className="tag">{guide.readingTime}</span>
            <span className="tag">By {guide.authorName}</span>
          </div>
          {guide.sponsorshipDisclosure ? (
            <p className="hint">{guide.sponsorshipDisclosure}</p>
          ) : null}
          <div className="actions">
            <Link className="button" href="/guides">
              Browse all guides
            </Link>
            <Link className="button primary" href="/businesses">
              Search the directory
            </Link>
          </div>
        </section>

        <section aria-labelledby="guide-sections-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A connected discovery journey</p>
              <h2 id="guide-sections-title">Explore the guide</h2>
            </div>
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
      </main>
      <SiteFooter />
    </>
  );
}
