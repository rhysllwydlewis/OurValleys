# Public Business Discovery Slice

## 1. Outcome

Issue #12 introduces the first connected public product slice on top of the application scaffold:

- one canonical business record;
- one directory result derived from that record;
- one generated business website derived from the same record;
- explicit server-only public projections;
- membership-based tenant permission checks;
- a clearly labelled fictional fixture;
- responsive, keyboard-tested public states.

This is an implementation proof, not a launch-data import or invitation to publish real businesses without the documented onboarding, verification and moderation controls.

## 2. Canonical model

Migration `0001_business_discovery.sql` adds the minimum coherent entities needed by the slice:

- category and place reference data;
- business and business membership;
- services;
- business location with separate public and private address fields;
- opening hours;
- business site;
- publication state.

The directory and `/b/[businessSlug]` route both query the same `business.id`. The business site does not maintain a second editable profile.

## 3. Public and private separation

`src/modules/businesses/public.ts` is the public read boundary. It selects a deliberately narrow output shape rather than serialising a canonical database row.

Public results may contain:

- trading name, slug, summary and description;
- managed category and place labels;
- published service and opening-hours content;
- public contact values;
- publication, verification and demonstration labels;
- a public location display derived from the visibility policy.

They do not select:

- private legal name;
- private address or postcode;
- membership and permission data;
- authentication data;
- unpublished businesses, sites or publications.

Integration tests prove that private fixture fields exist in the canonical database but are absent from the public serialised result.

## 4. Fictional fixture

The repeatable seed creates **Cwm & Coil Heating**, a fictional service-area business in Tonypandy. Every public page labels it as demonstration content. Its contact email uses the reserved `.example` domain, its exact address is a conspicuous non-real fixture, and it remains marked as not independently verified.

Running `pnpm db:seed` repeatedly updates the same stable identifiers rather than creating duplicates.

## 5. Public routes and states

### `/businesses`

- searchable by a bounded text query;
- filterable by launch place;
- displays organic demonstration results without paid-placement claims;
- includes loading, zero-results, data-unavailable and unexpected-error states.

### `/b/[businessSlug]`

- renders the canonical profile as a generated one-page website;
- includes services, hours, service area, contact, verification, update and correction information;
- hides private address fields;
- includes loading, unpublished/not-found, dependency-unavailable and unexpected-error states;
- remains `noindex` while the only content is fictional demonstration data.

### `/dashboard/business/[businessId]`

- requires an authenticated session;
- validates the requested identifier;
- requires an active membership for that exact business on the server;
- returns not found for invalid or unauthorised tenants to avoid business enumeration.

## 6. Accessibility and responsive behaviour

The UI provides semantic landmarks and headings, explicit labels, visible keyboard focus, sufficiently large controls, reduced-motion handling, high-contrast fallbacks and layouts for mobile, tablet and desktop.

Playwright verifies the directory at 390×844, 768×1024 and 1440×900, checks horizontal overflow, follows the keyboard order into search, and covers the generated page, zero-results state and missing route.

## 7. Validation contract

The pull-request workflow must prove:

- committed dependency lockfile and valid Railway configuration;
- formatting, lint and strict TypeScript;
- dependency compatibility and high-impact vulnerability audit;
- two migration and two seed executions;
- worker startup;
- unit and database integration tests;
- production build;
- configured runtime health, readiness, directory, zero-result, generated-site, missing-site and protected-route behaviour;
- Playwright viewport and keyboard inspection;
- an unconfigured production build where public discovery degrades honestly and protected/authentication access remains unavailable.

## 8. Successor boundaries

This slice does not yet implement business onboarding, claim review, editing, publishing controls, enquiries, real media, external email, search ranking beyond the bounded proof query or public launch data. Those require their own coherent workstreams and release gates.
