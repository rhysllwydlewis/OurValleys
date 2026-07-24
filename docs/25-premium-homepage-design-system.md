# Premium Homepage and Design System

## 1. Outcome

Issue #11 introduced the first recognisably OurValleys public homepage and reusable premium visual language. Issues #38, #40 and #42 then made the opening section more compact, connected authentication to Better Auth, hardened its fallback and exposed a deliberately public view-only demonstration account.

Issue #62 delivered the first full homepage experience recomposition. It kept those service, accessibility and performance boundaries while replacing the earlier long sequence of similar card grids with a stronger product story.

Issue #123 is the next focused refinement. It responds to product-owner review of the complete desktop composition and makes the homepage feel more like a living local product and less like a polished prototype. The revised story is:

1. immediate search beside one clear local-view product demonstration;
2. an early explanation that one business profile powers search, discovery routes and a generated website;
3. a useful category chooser with a coherent icon language;
4. distinct editorial sections for a featured business, events, areas and guides rather than one long field of similar white cards;
5. a complete flagship business-product demonstration; and
6. separate public-exploration and account-creation routes at the end of the page.

The change is a composition, language and interaction upgrade rather than a new content or data release. Named demonstration businesses and guides remain fictional. Event previews continue to use the existing public lifecycle projection.

## 2. Connected product behaviour

The homepage remains connected to the application rather than becoming a promotional mock-up:

- universal search submits to `/businesses` without requiring an account;
- location is selected manually and does not request precise device location;
- the featured canonical business, local-view demonstration and generated-site preview all read `Cwm & Coil Heating` through `getPublishedBusinessBySlug`;
- the complete generated page remains available at `/b/cwm-coil-heating`;
- event rows link to durable public event routes when projected data is ready;
- area links are built from the active public place projection rather than hard-coded place claims;
- public database failure removes or replaces affected previews honestly without blocking the rest of the homepage;
- the homepage sign-in dialog and dedicated `/login` route use the same Better Auth email-and-password boundary;
- `/account` authorises the session on the server and lists server-authorised memberships; and
- the public demo viewer can reach the protected fictional-business dashboard while edit and publish permissions remain denied.

The homepage does not claim that fictional events are live, that representative businesses are verified, that an area contains a particular number of listings, or that the wider editorial modules have launched.

## 3. Design-system and composition boundary

`src/app/design-system.css` continues to define the shared semantic tokens for canvas, surface, text, brand, accent, status, typography, spacing, radius, borders, elevation, glass, focus and forced-colour behaviour.

The homepage separates its concerns as follows:

- `src/components/home/home.module.css` owns the sticky navigation, mobile menu and authentication dialog or sheet shared by `HomeHeader`;
- `src/components/home/home-refined.module.css` owns the route composition, local-view demonstration, editorial discovery sections, generated-site story and responsive homepage layout; and
- `src/components/home/home-enhancements.tsx` provides only reduced-motion detection, stable reveal markers and a bounded desktop hero offset.

Glass remains selective. It is used for the navigation, search and the focused local-view demonstration. Reading-heavy modules use stable opaque surfaces or simple editorial dividers.

Rounded geometry is no longer used as the automatic wrapper for every content unit. Category links use a bordered grid, guide content uses editorial rows, the business proposition uses a dark full-width story and the footer uses ordinary grouped navigation.

## 4. Homepage story

### 4.1 Search and local context

The first screen keeps the proposition, English and Welsh supporting lines, universal search and popular searches server-rendered. The local context is stated directly as Rhondda Cynon Taf and reinforced through the Rhondda, Cynon, Taff and Ely place labels.

The right-side composition is one contained product demonstration rather than several unrelated floating panels. It combines existing compressed homepage imagery with three clear routes: a business website, an event and an area. The complete visual is removed at tablet and mobile sizes when it would compete with search.

### 4.2 One profile, a complete local presence

The generated-business-website differentiator now appears immediately after the hero rather than being discovered only near the bottom of the page. A concise three-stage strip explains that one structured profile can power:

1. local search;
2. place and category discovery routes; and
3. a complete generated business website.

The later flagship section remains because it demonstrates the same product in greater detail and links to the full fictional business site.

### 4.3 Useful categories

The category chooser remains a direct route into public business search. Emoji and typographic placeholder marks are replaced by one consistent inline-SVG icon family with the same stroke, visual weight and container treatment.

The cards are deliberately flatter and more editorial than the previous repeated floating-card treatment. Supporting descriptions remain visible at ordinary mobile sizes.

### 4.4 Connected discovery

The featured business and events form the main connected-discovery pair. Both expose text actions rather than relying on isolated arrow glyphs. The canonical business opens directly into its generated website.

Area discovery is a separate visual sequence with place names, deterministic sequence numbers and neutral route descriptions. It does not invent listing or event counts.

Guides use image-led editorial rows rather than another card grid. Additional fictional businesses sit in a compact supporting list, making the distinction between primary editorial content and secondary discovery examples clearer.

### 4.5 Honest demonstration language

Necessary disclosure is consolidated so warnings do not dominate every heading. The homepage uses natural labels such as “Demonstration profile” and one complete note that explains:

- named business and guide examples are fictional;
- event previews use the public lifecycle projection; and
- no preview implies real availability, popularity, verification or endorsement.

The generated-site facts retain the explicit `Fictional · not verified` status because that is the point where a mistaken real-world interpretation would carry the greatest risk.

### 4.6 Distinct resident and account routes

The closing section now offers two different actions:

- explore without an account; and
- create an account.

This preserves the principle that public discovery works before account walls while giving account creation an honest reason to exist.

The footer now exposes existing business, event, guide, news, business-owner and account routes. It does not introduce links to unimplemented legal or support pages.

## 5. Server-first and progressive enhancement

Essential hero content, search controls, discovery links, disclosure, business calls to action and footer navigation render on the server. Nothing important is hidden while JavaScript loads or while sections are outside the viewport.

`HomeEnhancements` remains deliberately small. It:

- detects reduced-motion preferences;
- applies stable visible-state markers for browser inspection; and
- adds a bounded requestAnimationFrame-managed hero offset on ordinary-motion devices.

Enhancement does not intercept scrolling, pin content, defer essential rendering or make any route dependent on animation.

## 6. Authentication interaction

The homepage sign-in control remains a normal link to `/login?next=/account`. When JavaScript is available, it progressively enhances into a native dialog and becomes a bottom sheet at mobile widths. Without JavaScript or when hydration fails, the dedicated route remains directly reachable from the same control.

Focus, Escape, backdrop close, focus restoration, scroll lock, form reset, accessible errors, same-origin return-path validation and the public-demo fill helper remain unchanged by issue #123.

## 7. Responsive and reduced-motion behaviour

The refined homepage has intentional desktop, tablet and mobile states rather than a scaled desktop layout:

- the full local-view demonstration is desktop-only and disappears before it would compete with search;
- the hero retains a bounded height at the tested desktop, tablet and mobile widths;
- the one-profile flow becomes a vertical explanatory sequence on small screens;
- category and area layouts step from three columns to two and then one;
- the featured business changes from split editorial artwork to a stacked mobile story;
- event actions move below event metadata when space is constrained;
- guide rows keep useful text while hiding only the redundant trailing action label;
- the generated-site demonstration removes rotation and decorative media on constrained layouts; and
- resident and footer actions become intentionally stacked.

Reduced-motion preferences disable parallax, decorative floating motion, reveal movement and transition movement while preserving every section and the same information hierarchy.

## 8. Media and performance boundary

The refinement reuses the existing compressed WebP assets. It adds no new media, autoplay video, map SDK, third-party homepage widget or animation library. The route retains the provisional mobile ceilings of 500 KB JavaScript and 350 KB imagery.

The desktop hero uses the existing strip assets inside one contained composition. The visual is not rendered at tablet or mobile breakpoints, avoiding a second heavy presentation for constrained layouts.

## 9. Validation contract

The homepage workstream validates:

- server-rendered content with and without database configuration;
- public search and manual location selection;
- canonical business reuse across local-view, discovery and generated-site surfaces;
- desktop, tablet and mobile layouts with no horizontal overflow;
- bounded hero heights at representative viewport sizes;
- the early one-profile-to-many-surfaces business narrative;
- clear business, event, area, guide and account actions;
- honest consolidated demonstration disclosure;
- no-JavaScript sign-in navigation and full authentication fallback;
- dialog focus, error, reset, Escape and scroll-lock behaviour;
- real public-demo sign-in and viewer permission denial;
- reduced-motion content parity; and
- the existing mobile JavaScript and image transfer ceilings.

Browser screenshots, traces, format logs and configured build output remain exported from CI for independent review.

## 10. Successor boundaries

Issue #123 does not activate real business claims, public registration approval, real event publishing, real guide content, precise geolocation, ratings, reviews, advertising or a map experience. Brand confirmation, local content sourcing, rights clearance and launch-data work remain separate evidence and approval workstreams.
