import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getInitials } from "@/lib/initials";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { listActiveCategories } from "@/modules/reference-data/categories";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await listActiveCategories();
  const selectedCategory = categories.find(
    (category) => category.slug === slug,
  );

  return {
    title: selectedCategory
      ? `${selectedCategory.name} businesses | OurValleys`
      : "Category not found | OurValleys",
    description: selectedCategory
      ? `Discover published fictional businesses in the provisional ${selectedCategory.name} category.`
      : "The requested provisional category route is not available.",
    robots: { index: false, follow: false },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const categories = await listActiveCategories();
  const selectedCategory = categories.find(
    (category) => category.slug === slug,
  );
  if (!selectedCategory) notFound();

  const result = await listPublishedBusinesses({
    category: selectedCategory.slug,
  });

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="category-title">
          <p className="eyebrow">Explore a local category</p>
          <h1 id="category-title">{selectedCategory.name}</h1>
          <p className="lead">
            A provisional category page connected to active reference data and
            published fictional business profiles.
          </p>
          <div className="actions">
            <Link
              className="button primary"
              href={`/businesses?category=${selectedCategory.slug}` as Route}
            >
              Search {selectedCategory.name}
            </Link>
            <Link className="button" href="/categories">
              Browse all categories
            </Link>
          </div>
        </section>

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Category results are temporarily unavailable.</h2>
            <p>Please return after the data service has recovered.</p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">No published demonstrations yet</p>
            <h2>No fictional businesses are listed in this category yet.</h2>
            <p>
              The category route is ready for future published businesses
              without inventing real local content or final taxonomy claims.
            </p>
            <Link className="button primary" href="/businesses">
              Explore all businesses
            </Link>
          </section>
        ) : (
          <section aria-labelledby="category-results-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Published demonstrations</p>
                <h2 id="category-results-title">
                  {result.businesses.length}{" "}
                  {result.businesses.length === 1
                    ? "business"
                    : "businesses"}
                </h2>
              </div>
              <p>Organic results · no paid placement</p>
            </div>
            <div className="business-grid">
              {result.businesses.map((business) => (
                <article className="business-card" key={business.id}>
                  <div className="business-card__art" aria-hidden="true">
                    <span className="business-card__initials">
                      {getInitials(business.tradingName)}
                    </span>
                    <span>{business.place.name}</span>
                  </div>
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">Fictional demo</span>
                    </div>
                    <h3>{business.tradingName}</h3>
                    <p>{business.summary}</p>
                    <Link
                      className="text-link"
                      href={`/b/${business.slug}` as Route}
                    >
                      View generated website
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
