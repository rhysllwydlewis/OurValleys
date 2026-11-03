# Catalogue index: categories and a searchable catalogue page

Builds on `docs/79` (catalogue entries), `docs/80` (catalogue pages) and doc 32 §8, §11.3.

## What it does

- **Categories.** Each product or treatment can carry an optional short category ("Bakery", "Haircuts") in the owner's section editor (a suggestion list offers the categories already used). Team members, questions, areas and facilities have none.
- **Grouped lists.** On the business website a products or treatments list with any category is shown under category headings in the owner's order, uncategorised items last under "Other". A list with no categories looks exactly as before.
- **Catalogue page** `/b/[slug]/catalogue`: every product, service and team member of the business in one place, grouped by list and category, with a plain GET form (works without script): search words, type, category and "hide sold-out items". Each card links to its item page. Each products/treatments/team section on the website links to it ("Browse the whole catalogue", pre-filtered to that type).
- Search is accent- and case-insensitive and matches name, description, detail text, category and list title; every word must match.
- SEO: canonical URL, `ItemList` structured data (first 50 items, none for demonstration businesses or filtered views), listed in the sitemap for real businesses that have entries. Filtered views are `noindex,follow` so only the plain page is indexed.
- English and Welsh page chrome; the owner's words are tagged as English inside a Welsh page. The Welsh strings are unreviewed by a fluent speaker.

## Rules

- **No migration.** `category` is stored inside the section JSON next to the other entry fields. Folding: names differing only by case or spacing are one group (first spelling shown). Limit 60 characters; at most 12 categories per list (the editor reports it).
- **Tenant isolation.** The page reads only the visible (active) sections of the business named in the URL via the same loader as the entry page; entries without a stored id are left out (they appear after the owner's next save). A business with nothing to list, or an unknown/unpublished slug, shows the not-found page; old slugs redirect.
- **Untrusted query string.** Unknown `type`, a control-character or over-long `q`, or an unknown category are cleaned or ignored, never an error. At most 200 items are drawn per page, with a note.
- **Rollback caveat.** The previous release ignores `category` and drops it on its next section save; items then show ungrouped. No data is otherwise lost.

## Implementation

`extra-sections-model.ts` (category field, parsing, `categoryNames`, `groupEntriesByCategory`), `catalogue-page-model.ts` (`parseCatalogueFilters`, `buildCatalogueIndex`), `content-features.ts` (schema), `business-extra-sections.tsx` (grouping and link), the route `src/app/b/[businessSlug]/catalogue/page.tsx`, `buildCatalogueListJsonLd`, `public-sitemap.ts`, the editor field.

## Not done

Per-entry Welsh text is now done (`docs/82`). Drag-reorder of entries, sort options on the catalogue page, Welsh review by a fluent speaker.
