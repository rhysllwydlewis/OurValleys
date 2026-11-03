# Catalogue pages: a page for each product, treatment and team member

Builds on `docs/79` (catalogue entries) and doc 32 §8, §11.3.

## What it does

- Each entry of a **products**, **treatments** or **team** section has its own public page at `/b/[slug]/catalogue/[entryId]`: large picture, name, price, stock badge (products), description, the owner's "Order online" or "Book online" link (never for sold-out items), an "Ask about this" link to the business contact page, and other items from the same list.
- On the business website the entry name in the price list, catalogue grid and team list links to that page. The owner's draft preview shows plain names (the pages exist only once the business is published).
- Page metadata names the item and business, canonical URL, the item's picture as the share image, `Product` (with an `Offer` only for a plain £ price), `Service` or `Person` structured data, and `noindex` for demonstration businesses. Entries with a stored id are listed in the sitemap.
- English and Welsh page chrome; the owner's words are tagged as English inside a Welsh page.

## Rules

- **Stable ids.** Each entry stores an `id` inside the section JSON (no migration). The editor posts every row's id back (`entryKey`), so renaming or reordering keeps the address. The id is untrusted: it is kept only if it looks like an id and is unique in the section; otherwise a fresh one is made. FAQ, areas and facilities entries get no id.
- **Legacy entries** (saved before this change) use `derivedEntryId(sectionId, index, title)` until the owner next saves the section, which stores that same id. They are not in the sitemap until then.
- **Tenant isolation.** The entry is looked up only among the visible (active) sections of the business named in the URL, so another business's id, a hidden section's id or a question's id gives the not-found page. A malformed id is rejected before any query.
- Old slugs redirect (as for the menu page).

- **Rollback caveat.** The previous release ignores stored ids and drops them on its next section save; links then fall back to derived ids and may change. The editor posts ids back, so the first save under this release stores them. A legacy entry's derived id depends on its position and name until that first save.

## Implementation

`catalogue-page-model.ts` (pure lookup and structured price), `extra-sections-model.ts` (`id`, `hasEntryPage`, `derivedEntryId`, parsing), `content-features.ts` (schema, derived ids on read), `buildCatalogueEntryJsonLd`, `public-sitemap.ts` (jsonb query, own guard), the route under `src/app/b/[businessSlug]/catalogue/[entryId]`, `business-extra-sections.tsx` (links).

## Not done

Product categories inside a list, a combined `/b/[slug]/catalogue` index, per-entry Welsh text, a share button on the entry page, crop tooling, ids in the sitemap for legacy entries before their next save.
