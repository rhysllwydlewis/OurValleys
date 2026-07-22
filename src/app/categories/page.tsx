import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listActiveCategories } from "@/modules/reference-data/categories";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore categories | OurValleys",
  description:
    "Browse provisional local business categories and discover published businesses across Rhondda Cynon Taf.",
  robots: { index: false, follow: false },
};

export default async function CategoriesPage() {
  const categories = await listActiveCategories();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="categories-title">
          <p className="eyebrow">Explore by category</p>
          <h1 id="categories-title">Find the kind of help you need.</h1>
          <p className="lead">
            These provisional categories remain configurable while the final
            local taxonomy and Welsh search terms continue through validation.
          </p>
        </section>

        {categories.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Category discovery is temporarily unavailable.</h2>
            <p>Keyword business search remains available.</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                Search businesses
              </Link>
              <Link className="button" href="/">
                Return home
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="category-list-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Active provisional categories</p>
                <h2 id="category-list-title">
                  Browse {categories.length} categories
                </h2>
              </div>
              <p>Fictional demonstration content only</p>
            </div>
            <div className="business-grid">
              {categories.map((category) => (
                <article className="business-card" key={category.id}>
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">Provisional category</span>
                    </div>
                    <h3>{category.name}</h3>
                    <p>
                      Browse published fictional businesses using this active
                      reference-data category.
                    </p>
                    <Link
                      className="text-link"
                      href={`/categories/${category.slug}` as Route}
                    >
                      Explore {category.name}
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
