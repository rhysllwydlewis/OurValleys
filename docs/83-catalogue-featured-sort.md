# 83 — Catalogue: featured entries and sort options

Builds on `docs/79`–`82` and doc 32 §8, §11.3.

## What it does

- **Owner editor.** Every product, treatment and team row has a "Featured" choice (with a hint). Featured is stored only when chosen.
- **Public badge.** Featured entries show a "Featured" badge on the website lists and on `/b/[slug]/catalogue` (English and Welsh).
- **Catalogue page.** A "Sort by" control (owner's order, featured first, name A–Z, price low–high, price high–low) and, when any entry is featured, a "Show featured items only" filter. Sorting applies inside each category group; unpriced entries sort last; ties keep the owner's order. Unknown `sort` or `featured` values are ignored.

## Rules

- **No migration.** `featured: true` lives in the section JSON beside the other entry fields (additive, optional in the stored schema).
- Sort never narrows the list, so it does not turn on the "x of y" count or the Clear link.
- Prices are read from the existing price line (`£12.50`, `from £8`, `50p`); anything without a number is "unpriced".
- Authorisation is unchanged: the existing `manageContent` check on the save action covers the new field.
- **Rollback caveat.** The previous release ignores `featured` and drops it on the next section save.

## Not done

Drag-reorder, Welsh category names, featured entries on the homepage of the business site, Welsh review by a fluent speaker (new strings are unreviewed).
