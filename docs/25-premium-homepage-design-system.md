# Premium Homepage and Design System

## 1. Outcome

Issue #11 introduces the first recognisably OurValleys public homepage and a reusable premium visual language on top of the existing application, business model and deployment boundary.

The implementation uses the supplied **OurValleys Homepage v3** Claude Design export as its approved visual reference. The export's proprietary runtime elements were not copied into production. Its layout, hierarchy, artwork, search-first interaction, selective glass treatment and content patterns were rebuilt as typed Next.js components and CSS.

## 2. Connected product behaviour

The homepage is not a disconnected mock-up:

- the universal search submits to `/businesses` without requiring an account;
- location is selected manually and does not request precise device location;
- the featured canonical business and generated-site demonstration both read `Cwm & Coil Heating` through `getPublishedBusinessBySlug`;
- the complete generated page remains available at `/b/cwm-coil-heating`;
- public database failure removes the canonical preview honestly without blocking the rest of the homepage;
- the dedicated `/login` route remains available independently of modal state.

The additional businesses, events and guides are representative fictional previews. They are visibly labelled and must not be treated as verified launch content.

## 3. Design system

`src/app/design-system.css` defines semantic tokens for:

- canvas, surface, text, brand, accent and status colours;
- sans and editorial display font stacks;
- spacing, radius, border, elevation and glass values;
- focus and forced-colour behaviour.

The homepage component stylesheet applies those tokens to navigation, fields, search, cards, status labels, content modules, calls to action, the dialog and mobile sheet. Glass is limited to the sticky navigation and a small number of high-value controls, with an opaque fallback when backdrop filtering is unavailable.

## 4. Server-first and progressive enhancement

Essential hero content, search controls, discovery links, fictional content labels and business calls to action render on the server. Nothing important is hidden while JavaScript loads.

`HomeEnhancements` progressively adds:

- intersection-based section reveals;
- a small requestAnimationFrame-managed hero offset;
- explicit reduced-motion detection.

It does not intercept scrolling, pin content or make any route dependent on animation.

## 5. Authentication interaction

The desktop sign-in control opens a native `dialog`; the same component becomes a bottom sheet at mobile widths. It provides:

- initial focus on the dedicated-route action;
- native Escape handling;
- focus restoration to the opening button;
- backdrop and explicit close controls;
- a normal form action to the dedicated `/login` fallback.

The preview does not enable incomplete authentication or collect credentials. The fallback route states clearly that no credentials are submitted or stored and directs users back to public discovery.

## 6. Responsive and reduced-motion behaviour

The implementation contains intentional desktop, tablet and mobile layouts rather than a scaled desktop composition. At narrow widths:

- navigation simplifies;
- the search becomes a vertical control group;
- grids recompose to one or two columns;
- generated-site content becomes a mobile composition;
- the login dialog becomes a safe-area-aware sheet.

Reduced-motion preferences disable the hero animation, scroll offset and reveal transitions while preserving every section and the same information hierarchy.

## 7. Media and performance boundary

The supplied homepage artwork was resized and converted to WebP for its rendered role. The committed source images are compressed for their rendered role and kept within a small, explicitly reviewed mobile media boundary. There is no autoplay video, map SDK or third-party homepage widget.

Playwright records transferred JavaScript and imagery on a 390 × 844 viewport and enforces provisional homepage ceilings of 500 KB JavaScript and 350 KB imagery. These are implementation safeguards, not permission to consume the full budget in successor work.

## 8. Validation contract

The workstream validates:

- server-rendered homepage content with and without the database configuration;
- public search submission and manual location selection;
- canonical business reuse;
- desktop, tablet and mobile layouts with no horizontal overflow;
- sign-in focus, Escape and focus-restoration behaviour;
- direct `/login` fallback;
- reduced-motion content parity;
- mobile JavaScript and image transfer ceilings;
- production build, runtime smoke tests and Railway deployment.

Browser screenshots are exported from CI for repeated independent visual inspection before merge.

## 9. Successor boundaries

This work does not activate public authentication, business onboarding, real event publishing, real guide content, precise geolocation, ratings, reviews or advertising. Those remain separate workstreams with their own data, trust and release gates.

The one-time branch packaging step is removed automatically after expanding the reviewed implementation files.
