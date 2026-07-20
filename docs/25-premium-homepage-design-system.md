# Premium Homepage and Design System

## 1. Outcome

Issue #11 introduced the first recognisably OurValleys public homepage and reusable premium visual language. Issues #38, #40 and #42 then made the opening section more compact, connected authentication to Better Auth, hardened its fallback and exposed a deliberately public view-only demonstration account.

Issue #62 is the first full homepage experience recomposition. It keeps those service, accessibility and performance boundaries, but replaces the earlier long sequence of similar card grids with a stronger product story:

1. immediate search beside a layered local-view composition;
2. direct resident pathways into services, places and representative weekend ideas;
3. a useful category chooser;
4. one connected editorial discovery board for businesses, events, places and guides; and
5. a flagship explanation of how one structured business profile powers both local discovery and a generated standalone website.

The change is a composition and interaction upgrade rather than a new content or data release. The additional businesses, events and guides remain clearly fictional representative previews.

## 2. Connected product behaviour

The homepage remains connected to the application rather than becoming a promotional mock-up:

- universal search submits to `/businesses` without requiring an account;
- location is selected manually and does not request precise device location;
- the featured canonical business and generated-site demonstration both read `Cwm & Coil Heating` through `getPublishedBusinessBySlug`;
- the complete generated page remains available at `/b/cwm-coil-heating`;
- public database failure removes the canonical preview honestly without blocking the rest of the homepage;
- the homepage sign-in dialog and dedicated `/login` route use the same Better Auth email-and-password boundary;
- `/account` authorises the session on the server and lists server-authorised memberships; and
- the public demo viewer can reach the protected fictional-business dashboard while edit and publish permissions remain denied.

The homepage does not claim that fictional events are live, that representative businesses are verified, or that the wider editorial modules have launched.

## 3. Design-system and composition boundary

`src/app/design-system.css` continues to define the shared semantic tokens for canvas, surface, text, brand, accent, status, typography, spacing, radius, borders, elevation, glass, focus and forced-colour behaviour.

The homepage now separates its concerns more clearly:

- `src/components/home/home.module.css` continues to own the sticky navigation, mobile menu and authentication dialog/sheet shared by `HomeHeader`;
- `src/components/home/home-overhaul.module.css` owns the route composition, editorial discovery board, generated-site story and responsive homepage layout; and
- the previous selector-heavy `src/app/home-compact.css` override is retired because the new route stylesheet defines the intended hero at source.

Glass remains selective. It is used for the navigation, search, hero discovery widget and focused controls, while reading-heavy modules use stable opaque surfaces.

## 4. Homepage story

### 4.1 Search and local context

The first screen keeps the proposition, English and Welsh supporting lines, universal search and popular searches server-rendered. A layered local-view composition gives the opening more identity without delaying search or turning the page into a passive film.

The right-side composition uses the existing compressed homepage imagery, restrained CSS depth and the canonical fictional business. It does not introduce autoplay video, a map SDK or another client dependency.

### 4.2 Useful pathways

The proof-point strip from the first homepage is replaced by resident-oriented pathways: find a service, explore a place and browse representative weekend ideas. These are ordinary links and remain usable without JavaScript.

### 4.3 Connected discovery board

Businesses, representative events, area links and guide concepts now sit in one asymmetric editorial board. This makes the modules feel like parts of a single local product rather than repeated unrelated grids. One consolidated disclosure explains the representative content boundary without allowing warnings to dominate every card.

### 4.4 One profile, multiple surfaces

The flagship business section explicitly shows the product transformation:

1. maintain one structured profile;
2. appear across local discovery; and
3. publish a generated, mobile-friendly website.

The visual demonstration reuses the same canonical fictional business record that powers the directory and full generated page.

## 5. Server-first and progressive enhancement

Essential hero content, search controls, discovery links, fictional-content labels and business calls to action render on the server. Nothing important is hidden while JavaScript loads or while sections are outside the viewport.

`HomeEnhancements` remains deliberately small. It:

- detects reduced-motion preferences;
- applies stable visible-state markers for browser inspection; and
- adds a bounded requestAnimationFrame-managed hero offset on ordinary-motion devices.

Enhancement does not intercept scrolling, pin content, defer essential rendering or make any route dependent on animation.

## 6. Authentication interaction

The homepage sign-in control remains a normal link to `/login?next=/account`. When JavaScript is available, it progressively enhances into a native dialog and becomes a bottom sheet at mobile widths. Without JavaScript or when hydration fails, the dedicated route remains directly reachable from the same control.

Focus, Escape, backdrop close, focus restoration, scroll lock, form reset, accessible errors, same-origin return-path validation and the public-demo fill helper remain unchanged by issue #62.

## 7. Responsive and reduced-motion behaviour

The recomposed homepage has intentional desktop, tablet and mobile states rather than a scaled desktop layout:

- the layered hero becomes a simplified atmospheric background at tablet widths;
- the floating local-view card is removed when it would compete with search;
- resident pathways stack vertically;
- the twelve-column discovery board becomes one coherent column;
- business previews and place mosaics use smaller editorial proportions; and
- the generated-site demonstration loses its decorative rotation on constrained layouts.

Reduced-motion preferences disable parallax, Ken Burns movement, decorative floating motion and reveal movement while preserving every section and the same information hierarchy.

## 8. Media and performance boundary

The recomposition reuses the existing compressed WebP assets. It adds no new media, autoplay video, map SDK, third-party homepage widget or animation library. The route retains the provisional mobile ceilings of 500 KB JavaScript and 350 KB imagery.

Search and first-screen copy remain server-rendered. Decorative imagery has reserved layout space, and the simplified tablet/mobile state avoids shipping a separate desktop animation implementation.

## 9. Validation contract

The homepage workstream validates:

- server-rendered content with and without database configuration;
- public search and manual location selection;
- canonical business reuse across discovery and generated-site surfaces;
- desktop, tablet and mobile layouts with no horizontal overflow;
- bounded hero heights at representative viewport sizes;
- the connected local-discovery story and resident pathways;
- the one-profile-to-many-surfaces business narrative;
- no-JavaScript sign-in navigation and full authentication fallback;
- dialog focus, error, reset, Escape and scroll-lock behaviour;
- real public-demo sign-in and viewer permission denial;
- reduced-motion content parity; and
- the existing mobile JavaScript and image transfer ceilings.

Browser screenshots, traces, format logs and configured build output remain exported from CI for independent review.

## 10. Successor boundaries

Issue #62 does not activate public registration, password recovery, real event publishing, real guide content, precise geolocation, ratings, reviews, advertising or a map experience. Brand confirmation, local content sourcing and launch-data work remain separate evidence and approval workstreams.
