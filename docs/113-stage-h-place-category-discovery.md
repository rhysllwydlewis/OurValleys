# Stage H place and category discovery baseline

## Purpose

This slice establishes durable public browse routes for residents who know a place or type of service but not an exact business name.

## Delivered routes

- `/places` lists active provisional place records.
- `/places/[slug]` resolves an active place and shows matching published businesses.
- `/categories` lists active provisional categories.
- `/categories/[slug]` resolves an active category and shows matching published businesses.

## Data and safety boundaries

- Indexes use the existing active place and category reference-data services.
- Detail routes reuse `listPublishedBusinesses`, preserving the existing publication filter and public projection.
- Unknown or inactive slugs return the application not-found response.
- Database failure produces an honest temporary-unavailable state.
- Valid routes with no published businesses produce a useful empty state rather than invented content.
- All current examples remain clearly labelled fictional demonstrations.
- The routes remain `noindex` while launch geography, taxonomy and real content are under validation in issues #2, #3 and #7.

## Experience baseline

The routes reuse the established public shell, cards, actions and state panels so desktop, tablet, mobile, keyboard and reduced-motion behaviour remain consistent with the existing design system.

## Successor work

The next Stage H slices should add focused route coverage, navigation connections, events, guides, saved businesses/events and live homepage composition. Final search-indexing decisions remain a launch gate and must not be inferred from this reversible baseline.
